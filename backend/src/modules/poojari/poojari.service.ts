import { getDb, IDatabaseClient } from '../../db/index.js';

export interface PoojariAssignmentSummary {
  seva_id: string;
  seva_name: string;
  telugu_name: string | null;
  category: string;
  timing: string | null;
  is_scheduled: boolean;
  scheduled_date: string | null;
  registration_count: number;
  registrations: {
    ticket_number: string;
    booking_number: string;
    ritual_beneficiary_name: string;
    gothra: string;
    family_details: string | null;
    booking_date: string;
    status: string;
    completed_at?: string | null;
    completed_by_name?: string | null;
  }[];
}

export class PoojariService {
  /**
   * Fetches assigned rituals for a specific poojari and date, or all temple sevas for the collaborative board.
   * STRICTLY READ-ONLY. NO FINANCIAL OR PAYMENT DATA RETURNED!
   */
  static async getAssignedRituals(
    poojariId?: string,
    targetDate: string = new Date().toISOString().split('T')[0], // YYYY-MM-DD
    sevaIdFilter?: string,
    client?: IDatabaseClient,
    allSevas: boolean = false
  ): Promise<PoojariAssignmentSummary[]> {
    const db = client || await getDb();

    // Check if poojari has explicit individual assignments
    let hasAssignments = false;
    if (!allSevas && poojariId) {
      const checkAssign = await db.query(
        `SELECT COUNT(*)::int as count FROM poojari_assignments WHERE poojari_id = $1`,
        [poojariId]
      );
      hasAssignments = checkAssign.rows[0].count > 0;
    }

    let sevaQuery = '';
    const params: any[] = [];

    // Requirement 9:
    // Scheduled sevas (is_scheduled = true) are only shown to the poojari on their scheduled_date!
    if (hasAssignments && !allSevas) {
      sevaQuery = `
        SELECT s.id, s.name, s.telugu_name, s.category, s.timing, s.is_scheduled, s.scheduled_date::text as scheduled_date
        FROM sevas s
        JOIN poojari_assignments pa ON pa.seva_id = s.id
        WHERE pa.poojari_id = $1
          AND s.is_active = true
          AND (s.is_scheduled = false OR (s.is_scheduled = true AND s.scheduled_date = $2::date))
      `;
      params.push(poojariId, targetDate);
    } else {
      // Shared Temple Ritual Board: Any priest can perform any scheduled or daily seva
      sevaQuery = `
        SELECT s.id, s.name, s.telugu_name, s.category, s.timing, s.is_scheduled, s.scheduled_date::text as scheduled_date
        FROM sevas s
        WHERE s.is_active = true
          AND (s.is_scheduled = false OR (s.is_scheduled = true AND s.scheduled_date = $1::date))
      `;
      params.push(targetDate);
    }

    if (sevaIdFilter) {
      params.push(sevaIdFilter);
      sevaQuery += ` AND s.id = $${params.length}`;
    }

    sevaQuery += ` ORDER BY s.name ASC`;
    const sevasRes = await db.query(sevaQuery, params);

    const summaries: PoojariAssignmentSummary[] = [];

    for (const seva of sevasRes.rows) {
      // Find all tickets for this seva booked for targetDate (or if scheduled pooja, matching scheduled date)
      // Only include active bookings (not cancelled)
      // NOTICE: We specifically DO NOT SELECT amount, payment_method, or payment_status!
      const ticketRes = await db.query(
        `SELECT t.ticket_number, b.booking_number, t.ritual_beneficiary_name, t.gothra,
                t.family_details, t.created_at::text as booking_date, t.status,
                t.completed_at::text as completed_at, u.name as completed_by_name
         FROM tickets t
         JOIN booking_items bi ON t.booking_item_id = bi.id
         JOIN bookings b ON t.booking_id = b.id
         LEFT JOIN staff_users u ON t.completed_by = u.id
         WHERE bi.seva_id = $1
           AND t.status IN ('issued', 'completed')
           AND b.booking_status != 'cancelled'
           AND (
             (bi.scheduled_date_snapshot IS NOT NULL AND bi.scheduled_date_snapshot = $2::date)
             OR (bi.scheduled_date_snapshot IS NULL AND (t.created_at + INTERVAL '5 hours 30 minutes')::date = $2::date)
           )
         ORDER BY t.created_at ASC`,
        [seva.id, targetDate]
      );

      summaries.push({
        seva_id: seva.id,
        seva_name: seva.name,
        telugu_name: seva.telugu_name,
        category: seva.category,
        timing: seva.timing,
        is_scheduled: seva.is_scheduled,
        scheduled_date: seva.scheduled_date,
        registration_count: ticketRes.rows.length,
        registrations: ticketRes.rows
      });
    }

    return summaries;
  }

  /**
   * Marks a ticket as completed by a Poojari when swiped or completed at the sanctum.
   */
  static async markTicketCompleted(
    ticketNumber: string,
    poojariId: string,
    client?: IDatabaseClient
  ): Promise<any> {
    const db = client || await getDb();
    const cleanNumber = ticketNumber.trim();

    const existingRes = await db.query(
      `SELECT t.*, b.booking_number FROM tickets t JOIN bookings b ON t.booking_id = b.id WHERE t.ticket_number = $1`,
      [cleanNumber]
    );

    if (existingRes.rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const targetTicket = existingRes.rows[0];
    const bookingId = targetTicket.booking_id;
    const bookingItemId = targetTicket.booking_item_id;

    // Mark ALL tickets belonging to this devotee's booking as completed,
    // ensuring every ticket in multi-ticket bookings receives the circular completed seal upon printing!
    const res = await db.query(
      `UPDATE tickets
       SET status = 'completed',
           completed_at = COALESCE(completed_at, NOW()),
           completed_by = COALESCE(completed_by, $2)
       WHERE booking_id = $1 OR booking_item_id = $3 OR ticket_number = $4
       RETURNING id, ticket_number, booking_id, status, completed_at, completed_by`,
      [bookingId, poojariId, bookingItemId, cleanNumber]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'POOJA_COMPLETED_BY_POOJARI', 'ticket', $2, $3)`,
      [
        poojariId,
        res.rows[0].id,
        JSON.stringify({
          ticket_number: cleanNumber,
          booking_id: res.rows[0].booking_id,
          completed_at: res.rows[0].completed_at
        })
      ]
    );

    // Get poojari name
    const uRes = await db.query(`SELECT name FROM staff_users WHERE id = $1`, [poojariId]);

    return {
      ...res.rows[0],
      completed_by_name: uRes.rows[0]?.name || null
    };
  }

  /**
   * Batch marks all pending tickets for a specific ritual date (and optional seva) as completed.
   * Useful for high-volume temple seva batches and administrative end-of-day closure.
   */
  static async batchMarkTicketsCompleted(
    targetDate: string,
    sevaId?: string,
    actorId: string = 'system',
    client?: IDatabaseClient
  ): Promise<{ updated_count: number; tickets: string[] }> {
    const db = client || await getDb();

    let query = `
      UPDATE tickets
      SET status = 'completed',
          completed_at = COALESCE(completed_at, NOW()),
          completed_by = COALESCE(completed_by, $1)
      WHERE id IN (
        SELECT t.id
        FROM tickets t
        JOIN booking_items bi ON t.booking_item_id = bi.id
        JOIN bookings b ON t.booking_id = b.id
        WHERE t.status = 'issued'
          AND b.booking_status != 'cancelled'
          AND (
            (bi.scheduled_date_snapshot IS NOT NULL AND bi.scheduled_date_snapshot = $2::date)
            OR (bi.scheduled_date_snapshot IS NULL AND (t.created_at + INTERVAL '5 hours 30 minutes')::date = $2::date)
          )
    `;
    const params: any[] = [actorId, targetDate];

    if (sevaId) {
      params.push(sevaId);
      query += ` AND bi.seva_id = $${params.length}`;
    }

    query += `
      )
      RETURNING id, ticket_number, booking_id
    `;

    const res = await db.query(query, params);

    if (res.rows.length > 0) {
      await db.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'BATCH_POOJA_COMPLETED', 'tickets', $2, $3)`,
        [
          actorId,
          res.rows[0].id,
          JSON.stringify({
            count: res.rows.length,
            target_date: targetDate,
            seva_id: sevaId || 'all',
            ticket_numbers: res.rows.map(r => r.ticket_number)
          })
        ]
      );
    }

    return {
      updated_count: res.rows.length,
      tickets: res.rows.map(r => r.ticket_number)
    };
  }
}

