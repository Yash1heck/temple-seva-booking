import { getDb, IDatabaseClient } from '../../db/index.js';
import { SevaService } from '../sevas/seva.service.js';
import { DevoteeService } from '../devotees/devotee.service.js';

export interface BookingCartItemInput {
  seva_id: string;
  quantity?: number;
  ritual_beneficiary_name?: string;
  gothra?: string;
  scheduled_date?: string | null;
}

export interface CreateBookingInput {
  devotee_id?: string | null;
  payer_name?: string | null;
  payer_mobile?: string | null;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details?: string | null;
  items: BookingCartItemInput[];
  payment: {
    method: 'cash' | 'upi';
    status?: 'confirmed' | 'pending';
    transaction_reference?: string | null;
    notes?: string | null;
  };
  client_submitted_total?: number; // Used to detect/reject invalid client-submitted totals
  created_by_id: string;
  idempotency_key?: string;
}

export interface BookingResult {
  booking: any;
  items: any[];
  tickets: any[];
  payment: any;
}

export class BookingService {
  /**
   * Generates next booking reference: e.g. B-01025
   */
  private static async generateBookingNumber(client: IDatabaseClient): Promise<string> {
    const res = await client.query(
      `SELECT COUNT(*)::int as count FROM bookings`
    );
    const count = (res.rows[0]?.count || 0) + 1;
    const baseNumber = 1000 + count;
    let candidate = `B-${String(baseNumber).padStart(5, '0')}`;
    
    // Check collision safety
    const exists = await client.query(`SELECT 1 FROM bookings WHERE booking_number = $1`, [candidate]);
    if (exists.rows.length > 0) {
      candidate = `B-${String(baseNumber + Math.floor(Math.random() * 9000)).padStart(5, '0')}`;
    }
    return candidate;
  }

  static async createBooking(input: CreateBookingInput, clientInstance?: IDatabaseClient): Promise<BookingResult> {
    const baseDb = clientInstance || await getDb();

    // RULE 1: ONE CART HAS ONE RITUAL BENEFICIARY (and one gothra)
    const beneficiary = input.ritual_beneficiary_name?.trim();
    const gothra = input.gothra?.trim();

    if (!beneficiary) {
      throw new Error('Ritual beneficiary name is required for booking');
    }
    if (!gothra) {
      throw new Error('Gothra is required for booking');
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('Cart must contain at least one seva item');
    }

    // RULE 3: DIFFERENT GOTHRA OR RITUAL BENEFICIARY REQUIRES A SEPARATE CART
    for (const item of input.items) {
      if (item.gothra && item.gothra.trim().toLowerCase() !== gothra.toLowerCase()) {
        throw new Error(
          `Conflicting gothra detected ('${item.gothra}' vs '${gothra}'). Each cart can only have one gothra. A separate booking is required for a different gothra.`
        );
      }
      if (item.ritual_beneficiary_name && item.ritual_beneficiary_name.trim().toLowerCase() !== beneficiary.toLowerCase()) {
        throw new Error(
          `Conflicting ritual beneficiary detected ('${item.ritual_beneficiary_name}' vs '${beneficiary}'). Each cart can only have one ritual beneficiary. A separate booking is required for a different person.`
        );
      }
    }

    // Wrap in database transaction
    return await baseDb.transaction(async (tx) => {
      // Check idempotency if key provided
      if (input.idempotency_key) {
        const existingAudit = await tx.query(
          `SELECT entity_id FROM audit_logs WHERE action = 'BOOKING_CREATED' AND details->>'idempotency_key' = $1 LIMIT 1`,
          [input.idempotency_key]
        );
        if (existingAudit.rows.length > 0) {
          const existingBookingId = existingAudit.rows[0].entity_id;
          return await this.getBookingDetails(existingBookingId, tx);
        }
      }

      // Fetch active seva prices from server database to prevent client tampering
      let calculatedServerTotal = 0;
      const verifiedItems: {
        seva_id: string;
        seva_name: string;
        price: number;
        quantity: number;
        item_total: number;
        scheduled_date: string | null;
      }[] = [];

      for (const item of input.items) {
        const seva = await SevaService.findById(item.seva_id, tx);
        if (!seva) {
          throw new Error(`Seva with ID '${item.seva_id}' not found`);
        }
        if (!seva.is_active) {
          throw new Error(`Seva '${seva.name}' is currently inactive and cannot be booked`);
        }

        const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
        const itemTotal = seva.price * qty;
        calculatedServerTotal += itemTotal;

        verifiedItems.push({
          seva_id: seva.id,
          seva_name: seva.name,
          price: seva.price,
          quantity: qty,
          item_total: itemTotal,
          scheduled_date: item.scheduled_date || (seva.is_scheduled ? seva.scheduled_date : null)
        });
      }

      // RULE 5: PAYMENT VALIDATION - Reject client-tampered totals
      if (input.client_submitted_total !== undefined) {
        const diff = Math.abs(input.client_submitted_total - calculatedServerTotal);
        if (diff > 0.01) {
          throw new Error(
            `Payment total mismatch. Server calculated ₹${calculatedServerTotal.toFixed(2)}, but client submitted ₹${input.client_submitted_total.toFixed(2)}.`
          );
        }
      }

      // Handle Devotee Profile: If new devotee or existing devotee, save or update activity
      let devoteeId = input.devotee_id;
      if (!devoteeId && input.payer_mobile) {
        // Look up by mobile or create
        const matches = await DevoteeService.findByMobile(input.payer_mobile, tx);
        if (matches.length > 0) {
          devoteeId = matches[0].id;
          await DevoteeService.touchActivity(devoteeId, tx);
        } else {
          const newDevotee = await DevoteeService.create({
            mobile: input.payer_mobile,
            name: input.payer_name || beneficiary,
            gothra: gothra,
            family_details: input.family_details || null
          }, tx);
          devoteeId = newDevotee.id;
        }
      } else if (devoteeId) {
        await DevoteeService.touchActivity(devoteeId, tx);
      }

      // Generate parent booking number
      const bookingNumber = await this.generateBookingNumber(tx);

      // Create Parent Booking Record
      const bookingInsert = await tx.query(
        `INSERT INTO bookings (
          booking_number, devotee_id, payer_name, payer_mobile,
          ritual_beneficiary_name, gothra, family_details,
          total_amount, booking_status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9)
        RETURNING *`,
        [
          bookingNumber,
          devoteeId || null,
          input.payer_name?.trim() || null,
          input.payer_mobile?.trim() || null,
          beneficiary,
          gothra,
          input.family_details?.trim() || null,
          calculatedServerTotal,
          input.created_by_id
        ]
      );
      const booking = bookingInsert.rows[0];
      const bookingId = booking.id;

      // RULE 4: EACH SEVA ITEM GETS ITS OWN TICKET
      const createdItems: any[] = [];
      const createdTickets: any[] = [];
      let ticketSequence = 1;

      for (const vItem of verifiedItems) {
        const itemInsert = await tx.query(
          `INSERT INTO booking_items (
            booking_id, seva_id, seva_name_snapshot, seva_price_snapshot,
            quantity, item_total, scheduled_date_snapshot
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            bookingId,
            vItem.seva_id,
            vItem.seva_name,
            vItem.price,
            vItem.quantity,
            vItem.item_total,
            vItem.scheduled_date
          ]
        );
        const itemRecord = itemInsert.rows[0];
        createdItems.push(itemRecord);

        // Generate 1 ticket per quantity of seva item
        for (let q = 0; q < vItem.quantity; q++) {
          const itemIndexFormatted = String(ticketSequence).padStart(2, '0');
          const ticketNumber = `${bookingNumber}-${itemIndexFormatted}`;
          
          const ticketInsert = await tx.query(
            `INSERT INTO tickets (
              ticket_number, booking_id, booking_item_id, item_index,
              seva_name, ritual_beneficiary_name, gothra, family_details,
              amount, status, reprint_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'issued', 0)
            RETURNING *`,
            [
              ticketNumber,
              bookingId,
              itemRecord.id,
              ticketSequence,
              vItem.seva_name,
              beneficiary,
              gothra,
              input.family_details?.trim() || null,
              vItem.price
            ]
          );
          createdTickets.push(ticketInsert.rows[0]);
          ticketSequence++;
        }
      }

      // Record Consolidated Payment for the Cart
      // Default cash is confirmed immediately; UPI can be confirmed or pending
      const paymentStatus = input.payment.status || (input.payment.method === 'cash' ? 'confirmed' : 'pending');
      const isConfirmed = paymentStatus === 'confirmed';

      const paymentInsert = await tx.query(
        `INSERT INTO payments (
          booking_id, amount, payment_method, payment_status,
          transaction_reference, verified_by, verified_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          bookingId,
          calculatedServerTotal,
          input.payment.method,
          paymentStatus,
          input.payment.transaction_reference?.trim() || null,
          isConfirmed ? input.created_by_id : null,
          isConfirmed ? new Date().toISOString() : null,
          input.payment.notes?.trim() || null
        ]
      );
      const payment = paymentInsert.rows[0];

      // Audit Trail Entry
      await tx.query(
        `INSERT INTO audit_logs (
          actor_id, action, entity_type, entity_id, details
        ) VALUES ($1, 'BOOKING_CREATED', 'booking', $2, $3)`,
        [
          input.created_by_id,
          bookingId,
          JSON.stringify({
            booking_number: bookingNumber,
            total_amount: calculatedServerTotal,
            ticket_count: createdTickets.length,
            payment_method: input.payment.method,
            payment_status: paymentStatus,
            idempotency_key: input.idempotency_key || null
          })
        ]
      );

      return {
        booking,
        items: createdItems,
        tickets: createdTickets,
        payment
      };
    });
  }

  static async getBookingDetails(bookingId: string, client?: IDatabaseClient): Promise<BookingResult> {
    const db = client || await getDb();
    const bRes = await db.query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
    if (bRes.rows.length === 0) throw new Error('Booking not found');
    const booking = bRes.rows[0];

    const iRes = await db.query(`SELECT * FROM booking_items WHERE booking_id = $1 ORDER BY created_at ASC`, [bookingId]);
    const tRes = await db.query(
      `SELECT t.*, u.name as completed_by_name
       FROM tickets t
       LEFT JOIN staff_users u ON t.completed_by = u.id
       WHERE t.booking_id = $1
       ORDER BY t.item_index ASC`,
      [bookingId]
    );
    const pRes = await db.query(`SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1`, [bookingId]);

    booking.total_amount = parseFloat(booking.total_amount) || 0;
    const tickets = tRes.rows.map(t => ({ ...t, amount: parseFloat(t.amount) || 0 }));
    const items = iRes.rows.map(i => ({
      ...i,
      seva_price_snapshot: parseFloat(i.seva_price_snapshot) || 0,
      item_total: parseFloat(i.item_total) || 0
    }));

    return {
      booking,
      items,
      tickets,
      payment: pRes.rows[0] ? { ...pRes.rows[0], amount: parseFloat(pRes.rows[0].amount) || 0 } : null
    };
  }

  static async listBookings(options: {
    startDate?: string;
    endDate?: string;
    bookingDate?: string;
    scheduledDate?: string;
    futureOnly?: boolean;
    search?: string;
    status?: string;
    paymentStatus?: string;
    limit?: number;
    offset?: number;
  } = {}, client?: IDatabaseClient) {
    const db = client || await getDb();
    let query = `
      SELECT b.*,
             p.payment_method, p.payment_status, p.transaction_reference,
             (SELECT COUNT(*)::int FROM tickets t WHERE t.booking_id = b.id) as ticket_count,
             (SELECT COUNT(*)::int FROM tickets t WHERE t.booking_id = b.id AND t.status = 'completed') as completed_ticket_count,
             (
               SELECT json_agg(json_build_object(
                 'seva_name', bi.seva_name_snapshot,
                 'quantity', bi.quantity,
                 'scheduled_date', bi.scheduled_date_snapshot
               ))
               FROM booking_items bi
               WHERE bi.booking_id = b.id
             ) as items_summary,
             (
               SELECT bool_or(bi.scheduled_date_snapshot IS NOT NULL AND bi.scheduled_date_snapshot > (b.created_at + INTERVAL '5 hours 30 minutes')::date)
               FROM booking_items bi
               WHERE bi.booking_id = b.id
             ) as is_advance_booking,
             (
               SELECT string_agg(DISTINCT bi.scheduled_date_snapshot::text, ', ')
               FROM booking_items bi
               WHERE bi.booking_id = b.id AND bi.scheduled_date_snapshot IS NOT NULL
             ) as scheduled_for_date
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by counter booking date (transaction date)
    if (options.bookingDate) {
      params.push(options.bookingDate);
      conditions.push(`(b.created_at + INTERVAL '5 hours 30 minutes')::date = $${params.length}::date`);
    }

    // Filter by ritual scheduled date (even if booked on an earlier date!)
    if (options.scheduledDate) {
      params.push(options.scheduledDate);
      conditions.push(`EXISTS (
        SELECT 1 FROM booking_items bi
        WHERE bi.booking_id = b.id
          AND (
            (bi.scheduled_date_snapshot IS NOT NULL AND bi.scheduled_date_snapshot = $${params.length}::date)
            OR (bi.scheduled_date_snapshot IS NULL AND (b.created_at + INTERVAL '5 hours 30 minutes')::date = $${params.length}::date)
          )
      )`);
    }

    // Filter for future advance bookings
    if (options.futureOnly) {
      conditions.push(`EXISTS (
        SELECT 1 FROM booking_items bi
        WHERE bi.booking_id = b.id
          AND bi.scheduled_date_snapshot IS NOT NULL
          AND bi.scheduled_date_snapshot > (CURRENT_TIMESTAMP + INTERVAL '5 hours 30 minutes')::date
      )`);
    }

    if (options.startDate) {
      params.push(options.startDate);
      conditions.push(`b.created_at >= $${params.length}::timestamptz`);
    }

    if (options.endDate) {
      params.push(options.endDate);
      conditions.push(`b.created_at <= ($${params.length}::date + INTERVAL '1 day')::timestamptz`);
    }

    if (options.status) {
      params.push(options.status);
      conditions.push(`b.booking_status = $${params.length}`);
    }

    if (options.paymentStatus) {
      params.push(options.paymentStatus);
      conditions.push(`p.payment_status = $${params.length}`);
    }

    if (options.search) {
      params.push(`%${options.search.trim()}%`);
      conditions.push(`(
        b.booking_number ILIKE $${params.length} OR
        b.ritual_beneficiary_name ILIKE $${params.length} OR
        b.payer_mobile ILIKE $${params.length} OR
        b.gothra ILIKE $${params.length} OR
        EXISTS (
          SELECT 1 FROM tickets tk WHERE tk.booking_id = b.id AND tk.ticket_number ILIKE $${params.length}
        )
      )`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY b.created_at DESC`;

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const res = await db.query(query, params);
    return res.rows.map(row => ({
      ...row,
      total_amount: parseFloat(row.total_amount) || 0,
      ticket_count: parseInt(row.ticket_count, 10) || 0,
      completed_ticket_count: parseInt(row.completed_ticket_count, 10) || 0
    }));
  }

  static async cancelBooking(bookingId: string, adminId: string, reason: string, client?: IDatabaseClient): Promise<any> {
    const baseDb = client || await getDb();

    if (!reason || !reason.trim()) {
      throw new Error('Cancellation reason is required');
    }

    return await baseDb.transaction(async (tx) => {
      const bRes = await tx.query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
      if (bRes.rows.length === 0) throw new Error('Booking not found');
      const booking = bRes.rows[0];

      if (booking.booking_status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }

      // Update booking status
      const updated = await tx.query(
        `UPDATE bookings
         SET booking_status = 'cancelled', cancellation_reason = $1, cancelled_by = $2, cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [reason.trim(), adminId, bookingId]
      );

      // Cancel tickets
      await tx.query(
        `UPDATE tickets SET status = 'cancelled' WHERE booking_id = $1`,
        [bookingId]
      );

      // Mark payment as refunded if it was confirmed, or cancelled
      await tx.query(
        `UPDATE payments
         SET payment_status = 'refunded', notes = COALESCE(notes, '') || ' [Refunded on cancellation: ' || $1 || ']'
         WHERE booking_id = $2`,
        [reason.trim(), bookingId]
      );

      // Audit Log
      await tx.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, reason)
         VALUES ($1, 'BOOKING_CANCELLED', 'booking', $2, $3, $4)`,
        [
          adminId,
          bookingId,
          JSON.stringify({ booking_number: booking.booking_number, total_amount: booking.total_amount }),
          reason.trim()
        ]
      );

      return updated.rows[0];
    });
  }
}
