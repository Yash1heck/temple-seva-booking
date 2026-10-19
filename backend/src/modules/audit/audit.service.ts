import { getDb, IDatabaseClient } from '../../db/index.js';

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export class AuditService {
  static async log(data: {
    actor_id?: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: any;
    reason?: string | null;
    ip_address?: string | null;
  }, client?: IDatabaseClient): Promise<void> {
    const db = client || await getDb();
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, reason, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.actor_id || null,
        data.action,
        data.entity_type,
        data.entity_id,
        data.details ? JSON.stringify(data.details) : null,
        data.reason || null,
        data.ip_address || null
      ]
    );
  }

  static async listLogs(options: {
    entity_type?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}, client?: IDatabaseClient): Promise<AuditLogEntry[]> {
    const db = client || await getDb();
    let query = `
      SELECT al.*, su.name as actor_name, su.username as actor_username
      FROM audit_logs al
      LEFT JOIN staff_users su ON al.actor_id = su.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.entity_type) {
      params.push(options.entity_type);
      conditions.push(`al.entity_type = $${params.length}`);
    }
    if (options.action) {
      params.push(options.action);
      conditions.push(`al.action = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY al.created_at DESC`;

    const limit = options.limit || 100;
    const offset = options.offset || 0;
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const res = await db.query(query, params);
    return res.rows;
  }
}

