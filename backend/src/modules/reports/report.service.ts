import { getDb, IDatabaseClient } from '../../db/index.js';

export interface ReportSummary {
  date_range: {
    start_date: string;
    end_date: string;
  };
  total_bookings: number;
  total_seva_items: number;
  financials: {
    booked_amount: number;
    confirmed_amount: number;
    cash_total: number;
    upi_total: number;
    pending_amount: number;
    refund_amount: number;
    net_collected_amount: number;
  };
  seva_breakdown: {
    seva_name: string;
    category: string;
    total_quantity: number;
    total_revenue: number;
  }[];
  payment_method_breakdown: {
    payment_method: string;
    count: number;
    confirmed_amount: number;
    pending_amount: number;
  }[];
  staff_activity: {
    staff_id: string;
    staff_name: string;
    booking_count: number;
    total_value: number;
  }[];
}

export class ReportService {
  static async generateReport(startDate: string, endDate: string, client?: IDatabaseClient): Promise<ReportSummary> {
    const db = client || await getDb();

    // 1. Total bookings & Booked Amount
    const bookingStatsRes = await db.query(
      `SELECT
         COUNT(b.id)::int as total_bookings,
         COALESCE(SUM(b.total_amount), 0)::numeric as booked_amount
       FROM bookings b
       WHERE b.created_at::date >= $1::date
         AND b.created_at::date <= $2::date
         AND b.booking_status != 'cancelled'`,
      [startDate, endDate]
    );
    const totalBookings = bookingStatsRes.rows[0]?.total_bookings || 0;
    const bookedAmount = parseFloat(bookingStatsRes.rows[0]?.booked_amount || '0');

    // 2. Total Seva Items
    const itemStatsRes = await db.query(
      `SELECT
         COALESCE(SUM(bi.quantity), 0)::int as total_seva_items
       FROM booking_items bi
       JOIN bookings b ON bi.booking_id = b.id
       WHERE b.created_at::date >= $1::date
         AND b.created_at::date <= $2::date
         AND b.booking_status != 'cancelled'`,
      [startDate, endDate]
    );
    const totalSevaItems = itemStatsRes.rows[0]?.total_seva_items || 0;

    // 3. Financials & Payment Collections (Avoid double counting consolidated cart payments!)
    const paymentsRes = await db.query(
      `SELECT
         payment_method,
         payment_status,
         COUNT(id)::int as count,
         COALESCE(SUM(amount), 0)::numeric as total_amount
       FROM payments
       WHERE created_at::date >= $1::date
         AND created_at::date <= $2::date
       GROUP BY payment_method, payment_status`,
      [startDate, endDate]
    );

    let confirmedAmount = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let pendingAmount = 0;
    let refundAmount = 0;

    const pmMap = new Map<string, { count: number; confirmed: number; pending: number }>();
    pmMap.set('cash', { count: 0, confirmed: 0, pending: 0 });
    pmMap.set('upi', { count: 0, confirmed: 0, pending: 0 });

    for (const row of paymentsRes.rows) {
      const amt = parseFloat(row.total_amount);
      const method = row.payment_method;
      const status = row.payment_status;
      const count = row.count;

      const current = pmMap.get(method) || { count: 0, confirmed: 0, pending: 0 };
      current.count += count;

      if (status === 'confirmed') {
        confirmedAmount += amt;
        current.confirmed += amt;
        if (method === 'cash') cashTotal += amt;
        if (method === 'upi') upiTotal += amt;
      } else if (status === 'pending') {
        pendingAmount += amt;
        current.pending += amt;
      } else if (status === 'refunded') {
        refundAmount += amt;
      }
      pmMap.set(method, current);
    }

    const netCollected = confirmedAmount - refundAmount;

    // 4. Seva-wise Breakdown
    const sevaStatsRes = await db.query(
      `SELECT
         bi.seva_name_snapshot as seva_name,
         COALESCE(s.category, 'General') as category,
         SUM(bi.quantity)::int as total_quantity,
         SUM(bi.item_total)::numeric as total_revenue
       FROM booking_items bi
       JOIN bookings b ON bi.booking_id = b.id
       LEFT JOIN sevas s ON bi.seva_id = s.id
       WHERE b.created_at::date >= $1::date
         AND b.created_at::date <= $2::date
         AND b.booking_status != 'cancelled'
       GROUP BY bi.seva_name_snapshot, s.category
       ORDER BY total_revenue DESC`,
      [startDate, endDate]
    );

    const sevaBreakdown = sevaStatsRes.rows.map(r => ({
      seva_name: r.seva_name,
      category: r.category,
      total_quantity: r.total_quantity,
      total_revenue: parseFloat(r.total_revenue)
    }));

    // 5. Staff activity
    const staffStatsRes = await db.query(
      `SELECT
         su.id as staff_id,
         su.name as staff_name,
         COUNT(b.id)::int as booking_count,
         COALESCE(SUM(b.total_amount), 0)::numeric as total_value
       FROM bookings b
       JOIN staff_users su ON b.created_by = su.id
       WHERE b.created_at::date >= $1::date
         AND b.created_at::date <= $2::date
         AND b.booking_status != 'cancelled'
       GROUP BY su.id, su.name
       ORDER BY booking_count DESC`,
      [startDate, endDate]
    );

    const staffActivity = staffStatsRes.rows.map(r => ({
      staff_id: r.staff_id,
      staff_name: r.staff_name,
      booking_count: r.booking_count,
      total_value: parseFloat(r.total_value)
    }));

    const paymentMethodBreakdown = Array.from(pmMap.entries()).map(([method, data]) => ({
      payment_method: method.toUpperCase(),
      count: data.count,
      confirmed_amount: data.confirmed,
      pending_amount: data.pending
    }));

    return {
      date_range: { start_date: startDate, end_date: endDate },
      total_bookings: totalBookings,
      total_seva_items: totalSevaItems,
      financials: {
        booked_amount: bookedAmount,
        confirmed_amount: confirmedAmount,
        cash_total: cashTotal,
        upi_total: upiTotal,
        pending_amount: pendingAmount,
        refund_amount: refundAmount,
        net_collected_amount: netCollected
      },
      seva_breakdown: sevaBreakdown,
      payment_method_breakdown: paymentMethodBreakdown,
      staff_activity: staffActivity
    };
  }

  static generateCsv(summary: ReportSummary): string {
    const lines: string[] = [];
    lines.push(`TEMPLE SEVA BOOKING SYSTEM - FINANCIAL & SEVA REPORT`);
    lines.push(`Report Range,${summary.date_range.start_date} to ${summary.date_range.end_date}`);
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push('');
    lines.push('--- FINANCIAL SUMMARY ---');
    lines.push(`Total Bookings,${summary.total_bookings}`);
    lines.push(`Total Seva Items,${summary.total_seva_items}`);
    lines.push(`Booked Amount,₹${summary.financials.booked_amount.toFixed(2)}`);
    lines.push(`Confirmed Collections,₹${summary.financials.confirmed_amount.toFixed(2)}`);
    lines.push(`Cash Collections,₹${summary.financials.cash_total.toFixed(2)}`);
    lines.push(`UPI Collections,₹${summary.financials.upi_total.toFixed(2)}`);
    lines.push(`Pending Payments,₹${summary.financials.pending_amount.toFixed(2)}`);
    lines.push(`Refunds / Cancellations,₹${summary.financials.refund_amount.toFixed(2)}`);
    lines.push(`Net Collected Amount,₹${summary.financials.net_collected_amount.toFixed(2)}`);
    lines.push('');
    lines.push('--- SEVA-WISE BREAKDOWN ---');
    lines.push('Seva Name,Category,Quantity Booked,Total Revenue (₹)');
    for (const item of summary.seva_breakdown) {
      lines.push(`"${item.seva_name}","${item.category}",${item.total_quantity},${item.total_revenue.toFixed(2)}`);
    }
    lines.push('');
    lines.push('--- STAFF COUNTER ACTIVITY ---');
    lines.push('Staff Name,Bookings Created,Total Value (₹)');
    for (const staff of summary.staff_activity) {
      lines.push(`"${staff.staff_name}",${staff.booking_count},${staff.total_value.toFixed(2)}`);
    }

    return lines.join('\n');
  }
}

