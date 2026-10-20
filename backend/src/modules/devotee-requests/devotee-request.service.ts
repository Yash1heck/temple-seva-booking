import { getDb, IDatabaseClient } from '../../db/index.js';

export interface DevoteeRequestItem {
  seva_id: string;
  seva_name: string;
  seva_price: number;
  quantity: number;
  scheduled_date?: string | null;
}

export interface CreateDevoteeRequestInput {
  devotee_name: string;
  gothra: string;
  family_details?: string | null;
  mobile: string;
  items: DevoteeRequestItem[];
}

export interface DevoteeBookingRequest {
  id: string;
  request_number: string;
  devotee_name: string;
  gothra: string;
  family_details: string | null;
  mobile: string;
  items: DevoteeRequestItem[];
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export class DevoteeRequestService {
  private static async generateRequestNumber(client: IDatabaseClient): Promise<string> {
    const res = await client.query(`SELECT COUNT(*)::int as count FROM devotee_booking_requests`);
    const count = (res.rows[0]?.count || 0) + 1;
    const baseNumber = 1000 + count;
    let candidate = `REQ-${String(baseNumber).padStart(5, '0')}`;
    const exists = await client.query(`SELECT 1 FROM devotee_booking_requests WHERE request_number = $1`, [candidate]);
    if (exists.rows.length > 0) {
      candidate = `REQ-${String(baseNumber + Math.floor(Math.random() * 9000)).padStart(5, '0')}`;
    }
    return candidate;
  }

  static async createRequest(
    input: CreateDevoteeRequestInput,
    client?: IDatabaseClient
  ): Promise<DevoteeBookingRequest> {
    const db = client || await getDb();

    if (!input.devotee_name?.trim()) {
      throw new Error('సంకల్ప కర్త పేరు తప్పనిసరి (Devotee name is required)');
    }
    if (!input.gothra?.trim()) {
      throw new Error('గోత్రము తప్పనిసరి (Gothram is required)');
    }
    if (!input.mobile?.trim()) {
      throw new Error('మొబైల్ సంఖ్య తప్పనిసరి (Mobile number is required)');
    }
    if (!input.items || input.items.length === 0) {
      throw new Error('కనీసం ఒక పూజా సేవను ఎంచుకోవాలి (At least one seva item must be selected)');
    }

    let calculatedTotal = 0;
    for (const item of input.items) {
      const qty = item.quantity || 1;
      const price = item.seva_price || 0;
      calculatedTotal += price * qty;
    }

    const requestNumber = await this.generateRequestNumber(db);

    const res = await db.query(
      `INSERT INTO devotee_booking_requests (
        request_number, devotee_name, gothra, family_details, mobile, items, total_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        requestNumber,
        input.devotee_name.trim(),
        input.gothra.trim(),
        input.family_details?.trim() || null,
        input.mobile.trim(),
        JSON.stringify(input.items),
        calculatedTotal
      ]
    );

    const r = res.rows[0];
    return {
      ...r,
      total_amount: parseFloat(r.total_amount),
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
    };
  }

  static async listPendingRequests(
    mobileFilter?: string,
    client?: IDatabaseClient
  ): Promise<DevoteeBookingRequest[]> {
    const db = client || await getDb();
    let query = `SELECT * FROM devotee_booking_requests WHERE status = 'pending'`;
    const params: any[] = [];

    if (mobileFilter && mobileFilter.trim()) {
      params.push(`%${mobileFilter.trim()}%`);
      query += ` AND (mobile ILIKE $1 OR request_number ILIKE $1 OR devotee_name ILIKE $1)`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const res = await db.query(query, params);
    return res.rows.map(r => ({
      ...r,
      total_amount: parseFloat(r.total_amount),
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
    }));
  }

  static async approveRequest(
    requestId: string,
    bookingId: string,
    client?: IDatabaseClient
  ): Promise<DevoteeBookingRequest> {
    const db = client || await getDb();
    const res = await db.query(
      `UPDATE devotee_booking_requests
       SET status = 'approved',
           approved_booking_id = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId, bookingId]
    );

    if (res.rows.length === 0) {
      throw new Error('Devotee request not found');
    }

    const r = res.rows[0];
    return {
      ...r,
      total_amount: parseFloat(r.total_amount),
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
    };
  }
}
