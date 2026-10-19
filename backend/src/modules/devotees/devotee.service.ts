import { getDb, IDatabaseClient } from '../../db/index.js';

export interface Devotee {
  id: string;
  mobile: string;
  name: string;
  gothra: string;
  family_details: string | null;
  profile_status: 'active' | 'inactive' | 'cleaned_up';
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export class DevoteeService {
  static async search(query: string, client?: IDatabaseClient): Promise<Devotee[]> {
    const db = client || await getDb();
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const res = await db.query(
      `SELECT id, mobile, name, gothra, family_details, profile_status, created_at, updated_at, last_activity_at
       FROM devotees
       WHERE (mobile ILIKE $1 OR name ILIKE $1)
         AND profile_status = 'active'
       ORDER BY last_activity_at DESC
       LIMIT 20`,
      [`%${cleanQuery}%`]
    );
    return res.rows;
  }

  static async findById(id: string, client?: IDatabaseClient): Promise<Devotee | null> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT id, mobile, name, gothra, family_details, profile_status, created_at, updated_at, last_activity_at
       FROM devotees
       WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  static async findByMobile(mobile: string, client?: IDatabaseClient): Promise<Devotee[]> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT id, mobile, name, gothra, family_details, profile_status, created_at, updated_at, last_activity_at
       FROM devotees
       WHERE mobile = $1 AND profile_status = 'active'
       ORDER BY last_activity_at DESC`,
      [mobile.trim()]
    );
    return res.rows;
  }

  static async create(data: {
    mobile: string;
    name: string;
    gothra: string;
    family_details?: string | null;
  }, client?: IDatabaseClient): Promise<Devotee> {
    const db = client || await getDb();
    const res = await db.query(
      `INSERT INTO devotees (mobile, name, gothra, family_details, profile_status, last_activity_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())
       RETURNING id, mobile, name, gothra, family_details, profile_status, created_at, updated_at, last_activity_at`,
      [data.mobile.trim(), data.name.trim(), data.gothra.trim(), data.family_details?.trim() || null]
    );
    return res.rows[0];
  }

  static async update(id: string, data: {
    name?: string;
    gothra?: string;
    family_details?: string | null;
    mobile?: string;
  }, client?: IDatabaseClient): Promise<Devotee> {
    const db = client || await getDb();
    const existing = await this.findById(id, db);
    if (!existing) {
      throw new Error('Devotee not found');
    }

    const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
    const updatedGothra = data.gothra !== undefined ? data.gothra.trim() : existing.gothra;
    const updatedFamily = data.family_details !== undefined ? data.family_details?.trim() || null : existing.family_details;
    const updatedMobile = data.mobile !== undefined ? data.mobile.trim() : existing.mobile;

    const res = await db.query(
      `UPDATE devotees
       SET name = $1, gothra = $2, family_details = $3, mobile = $4, updated_at = NOW(), last_activity_at = NOW()
       WHERE id = $5
       RETURNING id, mobile, name, gothra, family_details, profile_status, created_at, updated_at, last_activity_at`,
      [updatedName, updatedGothra, updatedFamily, updatedMobile, id]
    );
    return res.rows[0];
  }

  static async touchActivity(id: string, client?: IDatabaseClient): Promise<void> {
    const db = client || await getDb();
    await db.query(`UPDATE devotees SET last_activity_at = NOW() WHERE id = $1`, [id]);
  }
}

