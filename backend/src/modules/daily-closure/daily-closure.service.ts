import { getDb, IDatabaseClient } from '../../db/index.js';
import { ReportService } from '../reports/report.service.js';

export interface DailyClosureStatus {
  date: string;
  is_closed: boolean;
  closure_record?: any;
  summary: {
    total_bookings: number;
    total_seva_items: number;
    booked_amount: number;
    confirmed_amount: number;
    cash_total: number;
    upi_total: number;
    pending_amount: number;
    refund_amount: number;
    net_collected_amount: number;
  };
  pending_payments_count: number;
}

export class DailyClosureService {
  static async getStatus(date: string, client?: IDatabaseClient): Promise<DailyClosureStatus> {
    const db = client || await getDb();
    
    // Check if already closed for this date
    const closureRes = await db.query(
      `SELECT dc.*, su.name as closed_by_name
       FROM daily_closures dc
       LEFT JOIN staff_users su ON dc.closed_by = su.id
       WHERE dc.closure_date = $1::date`,
      [date]
    );

    const isClosed = closureRes.rows.length > 0;
    const closureRecord = isClosed ? closureRes.rows[0] : null;

    // Generate real-time summary for this date
    const report = await ReportService.generateReport(date, date, db);

    // Count pending payments
    const pendingRes = await db.query(
      `SELECT COUNT(*)::int as count FROM payments
       WHERE created_at::date = $1::date AND payment_status = 'pending'`,
      [date]
    );
    const pendingCount = pendingRes.rows[0]?.count || 0;

    return {
      date,
      is_closed: isClosed,
      closure_record: closureRecord,
      summary: {
        total_bookings: report.total_bookings,
        total_seva_items: report.total_seva_items,
        booked_amount: report.financials.booked_amount,
        confirmed_amount: report.financials.confirmed_amount,
        cash_total: report.financials.cash_total,
        upi_total: report.financials.upi_total,
        pending_amount: report.financials.pending_amount,
        refund_amount: report.financials.refund_amount,
        net_collected_amount: report.financials.net_collected_amount
      },
      pending_payments_count: pendingCount
    };
  }

  static async performClosure(date: string, adminId: string, notes?: string, client?: IDatabaseClient) {
    const baseDb = client || await getDb();

    return await baseDb.transaction(async (tx) => {
      // Check if already closed
      const existing = await tx.query(`SELECT id FROM daily_closures WHERE closure_date = $1::date`, [date]);
      if (existing.rows.length > 0) {
        throw new Error(`Daily closure for ${date} has already been recorded`);
      }

      const report = await ReportService.generateReport(date, date, tx);

      const ins = await tx.query(
        `INSERT INTO daily_closures (
          closure_date, total_bookings, total_seva_items,
          booked_amount, confirmed_amount, cash_total, upi_total,
          pending_amount, refund_amount, net_collected_amount,
          closed_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          date,
          report.total_bookings,
          report.total_seva_items,
          report.financials.booked_amount,
          report.financials.confirmed_amount,
          report.financials.cash_total,
          report.financials.upi_total,
          report.financials.pending_amount,
          report.financials.refund_amount,
          report.financials.net_collected_amount,
          adminId,
          notes?.trim() || null
        ]
      );

      const closure = ins.rows[0];

      // Audit Log
      await tx.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'DAILY_CLOSURE_PERFORMED', 'daily_closure', $2, $3)`,
        [
          adminId,
          closure.id,
          JSON.stringify({
            closure_date: date,
            net_collected: report.financials.net_collected_amount,
            cash_total: report.financials.cash_total,
            upi_total: report.financials.upi_total,
            pending_amount: report.financials.pending_amount
          })
        ]
      );

      return closure;
    });
  }

  static async listClosures(limit = 30, client?: IDatabaseClient) {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT dc.*, su.name as closed_by_name
       FROM daily_closures dc
       LEFT JOIN staff_users su ON dc.closed_by = su.id
       ORDER BY dc.closure_date DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}
