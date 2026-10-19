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
                t.family_details, t.created_at::text as booking_date, t.status
         FROM tickets t
         JOIN booking_items bi ON t.booking_item_id = bi.id
         JOIN bookings b ON t.booking_id = b.id
         WHERE bi.seva_id = $1
           AND t.status = 'issued'
           AND b.booking_status != 'cancelled'
           AND (
             (bi.scheduled_date_snapshot IS NOT NULL AND bi.scheduled_date_snapshot = $2::date)
             OR (bi.scheduled_date_snapshot IS NULL AND t.created_at::date = $2::date)
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
}

