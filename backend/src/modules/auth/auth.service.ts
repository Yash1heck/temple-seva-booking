import bcrypt from 'bcryptjs';
import { getDb, IDatabaseClient } from '../../db/index.js';

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'booking_staff' | 'poojari';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  static async findByUsername(username: string, client?: IDatabaseClient): Promise<(StaffUser & { password_hash: string }) | null> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT id, username, name, role, password_hash, is_active, created_at, updated_at
       FROM staff_users
       WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))`,
      [username]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  static async findById(id: string, client?: IDatabaseClient): Promise<StaffUser | null> {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT id, username, name, role, is_active, created_at, updated_at
       FROM staff_users
       WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  static async listUsers(role?: string, client?: IDatabaseClient): Promise<StaffUser[]> {
    const db = client || await getDb();
    let query = `SELECT id, username, name, role, is_active, created_at, updated_at FROM staff_users`;
    const params: any[] = [];
    if (role) {
      query += ` WHERE role = $1`;
      params.push(role);
    }
    query += ` ORDER BY created_at ASC`;
    const res = await db.query(query, params);
    return res.rows;
  }

  static async createUser(data: {
    username: string;
    name: string;
    role: 'admin' | 'booking_staff' | 'poojari';
    password: string;
  }, client?: IDatabaseClient): Promise<StaffUser> {
    const db = client || await getDb();
    const existing = await this.findByUsername(data.username, db);
    if (existing) {
      throw new Error(`Username '${data.username}' is already taken`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const res = await db.query(
      `INSERT INTO staff_users (username, name, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, name, role, is_active, created_at, updated_at`,
      [data.username, data.name, data.role, passwordHash]
    );
    return res.rows[0];
  }

  static async updateUserStatus(id: string, isActive: boolean, client?: IDatabaseClient): Promise<StaffUser> {
    const db = client || await getDb();
    const res = await db.query(
      `UPDATE staff_users
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, name, role, is_active, created_at, updated_at`,
      [isActive, id]
    );
    if (res.rows.length === 0) {
      throw new Error('User not found');
    }
    return res.rows[0];
  }

  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

