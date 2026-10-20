import { getDb, IDatabaseClient } from '../../db/index.js';
import { toTeluguSevaName } from '../../utils/teluguTransliteration.js';

export interface Seva {
  id: string;
  name: string;
  telugu_name: string | null;
  description: string | null;
  category: string;
  price: number;
  is_active: boolean;
  is_scheduled: boolean;
  scheduled_date: string | null;
  timing: string | null;
  created_at: string;
  updated_at: string;
  assigned_poojaris?: { id: string; name: string }[];
}

export class SevaService {
  static async listAll(options: {
    onlyActive?: boolean;
    poojariId?: string;
    targetDate?: string; // Asia/Kolkata date YYYY-MM-DD
  } = {}, client?: IDatabaseClient): Promise<Seva[]> {
    const db = client || await getDb();
    let query = `
      SELECT s.id, s.name, s.telugu_name, s.description, s.category, s.price::numeric as price,
             s.is_active, s.is_scheduled, s.scheduled_date::text as scheduled_date, s.timing,
             s.created_at, s.updated_at
      FROM sevas s
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (options.onlyActive) {
      conditions.push(`s.is_active = true`);
    }

    // If querying for a specific poojari (Poojari Dashboard)
    if (options.poojariId) {
      params.push(options.poojariId);
      conditions.push(`s.id IN (SELECT seva_id FROM poojari_assignments WHERE poojari_id = $${params.length})`);

      // Requirement 9:
      // "once a pooja is scheduled it will be shown in pooja dashboard for booking but for poojari the pooja will be shown on the scheduled date only"
      if (options.targetDate) {
        params.push(options.targetDate);
        conditions.push(`(s.is_scheduled = false OR (s.is_scheduled = true AND s.scheduled_date = $${params.length}::date))`);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY s.category ASC, s.price ASC, s.name ASC`;

    const res = await db.query(query, params);
    const sevas: Seva[] = res.rows.map(r => ({
      ...r,
      price: parseFloat(r.price)
    }));

    // Fetch assigned poojaris
    const assignmentsRes = await db.query(`
      SELECT pa.seva_id, su.id as poojari_id, su.name as poojari_name
      FROM poojari_assignments pa
      JOIN staff_users su ON pa.poojari_id = su.id
    `);

    const assignmentMap = new Map<string, { id: string; name: string }[]>();
    for (const a of assignmentsRes.rows) {
      const list = assignmentMap.get(a.seva_id) || [];
      list.push({ id: a.poojari_id, name: a.poojari_name });
      assignmentMap.set(a.seva_id, list);
    }

    for (const s of sevas) {
      s.assigned_poojaris = assignmentMap.get(s.id) || [];
    }

    return sevas;
  }

  static async findById(id: string, client?: IDatabaseClient): Promise<Seva | null> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT id, name, telugu_name, description, category, price::numeric as price,
              is_active, is_scheduled, scheduled_date::text as scheduled_date, timing,
              created_at, updated_at
       FROM sevas
       WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const s = res.rows[0];
    return {
      ...s,
      price: parseFloat(s.price)
    };
  }

  static async create(data: {
    name: string;
    telugu_name?: string | null;
    description?: string | null;
    category?: string;
    price: number;
    is_active?: boolean;
    is_scheduled?: boolean;
    scheduled_date?: string | null;
    timing?: string | null;
    assigned_poojari_ids?: string[];
  }, client?: IDatabaseClient): Promise<Seva> {
    const db = client || await getDb();

    if (data.price < 0) {
      throw new Error('Price cannot be negative');
    }

    const trimmedName = data.name.trim();

    // Idempotency: prevent rapid multi-clicks or duplicate creation of same seva
    const existing = await db.query(
      `SELECT id, name, telugu_name, description, category, price::numeric as price,
              is_active, is_scheduled, scheduled_date::text as scheduled_date, timing,
              created_at, updated_at
       FROM sevas
       WHERE LOWER(TRIM(name)) = LOWER($1)
       LIMIT 1`,
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      const existingSeva = existing.rows[0];
      if (data.assigned_poojari_ids && data.assigned_poojari_ids.length > 0) {
        for (const poojariId of data.assigned_poojari_ids) {
          await db.query(
            `INSERT INTO poojari_assignments (poojari_id, seva_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [poojariId, existingSeva.id]
          );
        }
      }
      return {
        ...existingSeva,
        price: parseFloat(existingSeva.price)
      };
    }

    const teluguName = (data.telugu_name && data.telugu_name.trim().length > 0)
      ? data.telugu_name.trim()
      : toTeluguSevaName(trimmedName);

    const res = await db.query(
      `INSERT INTO sevas (name, telugu_name, description, category, price, is_active, is_scheduled, scheduled_date, timing)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, telugu_name, description, category, price::numeric as price,
                 is_active, is_scheduled, scheduled_date::text as scheduled_date, timing,
                 created_at, updated_at`,
      [
        trimmedName,
        teluguName || null,
        data.description?.trim() || null,
        data.category?.trim() || 'Daily Pooja',
        data.price,
        data.is_active ?? true,
        data.is_scheduled ?? false,
        data.scheduled_date || null,
        data.timing?.trim() || null
      ]
    );

    const seva = res.rows[0];
    const sevaId = seva.id;

    if (data.assigned_poojari_ids && data.assigned_poojari_ids.length > 0) {
      for (const poojariId of data.assigned_poojari_ids) {
        await db.query(
          `INSERT INTO poojari_assignments (poojari_id, seva_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [poojariId, sevaId]
        );
      }
    }

    return {
      ...seva,
      price: parseFloat(seva.price)
    };
  }

  static async update(id: string, data: {
    name?: string;
    telugu_name?: string | null;
    description?: string | null;
    category?: string;
    price?: number;
    is_active?: boolean;
    is_scheduled?: boolean;
    scheduled_date?: string | null;
    timing?: string | null;
    assigned_poojari_ids?: string[];
  }, client?: IDatabaseClient): Promise<Seva> {
    const db = client || await getDb();
    const existing = await this.findById(id, db);
    if (!existing) {
      throw new Error('Seva not found');
    }

    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price cannot be negative');
    }

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const telugu_name = (data.telugu_name !== undefined && data.telugu_name !== null && data.telugu_name.trim().length > 0)
      ? data.telugu_name.trim()
      : (existing.telugu_name || toTeluguSevaName(name));
    const description = data.description !== undefined ? data.description?.trim() || null : existing.description;
    const category = data.category !== undefined ? data.category.trim() : existing.category;
    const price = data.price !== undefined ? data.price : existing.price;
    const is_active = data.is_active !== undefined ? data.is_active : existing.is_active;
    const is_scheduled = data.is_scheduled !== undefined ? data.is_scheduled : existing.is_scheduled;
    const scheduled_date = data.scheduled_date !== undefined ? data.scheduled_date || null : existing.scheduled_date;
    const timing = data.timing !== undefined ? data.timing?.trim() || null : existing.timing;

    const res = await db.query(
      `UPDATE sevas
       SET name = $1, telugu_name = $2, description = $3, category = $4, price = $5,
           is_active = $6, is_scheduled = $7, scheduled_date = $8, timing = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING id, name, telugu_name, description, category, price::numeric as price,
                 is_active, is_scheduled, scheduled_date::text as scheduled_date, timing,
                 created_at, updated_at`,
      [name, telugu_name, description, category, price, is_active, is_scheduled, scheduled_date, timing, id]
    );

    if (data.assigned_poojari_ids !== undefined) {
      await db.query(`DELETE FROM poojari_assignments WHERE seva_id = $1`, [id]);
      for (const poojariId of data.assigned_poojari_ids) {
        await db.query(
          `INSERT INTO poojari_assignments (poojari_id, seva_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [poojariId, id]
        );
      }
    }

    const updated = res.rows[0];
    return {
      ...updated,
      price: parseFloat(updated.price)
    };
  }

  static async setStatus(id: string, isActive: boolean, client?: IDatabaseClient): Promise<Seva> {
    const db = client || await getDb();
    const res = await db.query(
      `UPDATE sevas SET is_active = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, telugu_name, description, category, price::numeric as price,
                 is_active, is_scheduled, scheduled_date::text as scheduled_date, timing,
                 created_at, updated_at`,
      [isActive, id]
    );
    if (res.rows.length === 0) throw new Error('Seva not found');
    const s = res.rows[0];
    return { ...s, price: parseFloat(s.price) };
  }
}

