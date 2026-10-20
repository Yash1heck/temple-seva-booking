import { getDb, IDatabaseClient } from '../../db/index.js';

export interface TicketDetails {
  id: string;
  ticket_number: string;
  booking_id: string;
  booking_number: string;
  item_index: number;
  seva_name: string;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details: string | null;
  amount: number;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  reprint_count: number;
  last_reprinted_at: string | null;
  created_at: string;
  payment_method: string;
  payment_status: string;
}

export class TicketService {
  static async findByNumber(ticketNumber: string, client?: IDatabaseClient): Promise<TicketDetails | null> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT t.*, b.booking_number, p.payment_method, p.payment_status,
              u.name as completed_by_name
       FROM tickets t
       JOIN bookings b ON t.booking_id = b.id
       LEFT JOIN payments p ON p.booking_id = b.id
       LEFT JOIN staff_users u ON t.completed_by = u.id
       WHERE t.ticket_number = $1`,
      [ticketNumber.trim()]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      amount: parseFloat(r.amount)
    };
  }

  static async findById(id: string, client?: IDatabaseClient): Promise<TicketDetails | null> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT t.*, b.booking_number, p.payment_method, p.payment_status,
              u.name as completed_by_name
       FROM tickets t
       JOIN bookings b ON t.booking_id = b.id
       LEFT JOIN payments p ON p.booking_id = b.id
       LEFT JOIN staff_users u ON t.completed_by = u.id
       WHERE t.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      amount: parseFloat(r.amount)
    };
  }

  static async listByBookingId(bookingId: string, client?: IDatabaseClient): Promise<TicketDetails[]> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT t.*, b.booking_number, p.payment_method, p.payment_status,
              u.name as completed_by_name
       FROM tickets t
       JOIN bookings b ON t.booking_id = b.id
       LEFT JOIN payments p ON p.booking_id = b.id
       LEFT JOIN staff_users u ON t.completed_by = u.id
       WHERE t.booking_id = $1
       ORDER BY t.item_index ASC`,
      [bookingId]
    );
    return res.rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount)
    }));
  }

  /**
   * RULE 7: TICKET REPRINTING
   * Reprinting an existing ticket must NOT create a new booking, ticket number, payment, or revenue entry.
   */
  static async reprintTicket(ticketId: string, actorId: string, client?: IDatabaseClient): Promise<TicketDetails> {
    const db = client || await getDb();
    const existing = await this.findById(ticketId, db);
    if (!existing) {
      throw new Error('Ticket not found');
    }

    // Increment reprint count and update timestamp
    const res = await db.query(
      `UPDATE tickets
       SET reprint_count = reprint_count + 1, last_reprinted_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [ticketId]
    );

    // Audit Log Entry
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'TICKET_REPRINTED', 'ticket', $2, $3)`,
      [
        actorId,
        ticketId,
        JSON.stringify({
          ticket_number: existing.ticket_number,
          new_reprint_count: existing.reprint_count + 1
        })
      ]
    );

    const updated = await this.findById(ticketId, db);
    return updated!;
  }
}

