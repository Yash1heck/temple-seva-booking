import { getDb, IDatabaseClient } from '../../db/index.js';

export class SettingsService {
  static async getAll(client?: IDatabaseClient): Promise<Record<string, any>> {
    const db = client || await getDb();
    const res = await db.query(`SELECT key, value, description FROM temple_settings`);
    const settings: Record<string, any> = {};
    for (const row of res.rows) {
      settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    }
    return settings;
  }

  static async getByKey(key: string, client?: IDatabaseClient): Promise<any> {
    const db = client || await getDb();
    const res = await db.query(`SELECT value FROM temple_settings WHERE key = $1`, [key]);
    if (res.rows.length === 0) return null;
    return typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
  }

  static async updateKey(key: string, value: any, client?: IDatabaseClient): Promise<any> {
    const db = client || await getDb();
    const jsonVal = JSON.stringify(value);
    const res = await db.query(
      `INSERT INTO temple_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING key, value`,
      [key, jsonVal]
    );
    return typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
  }
}

