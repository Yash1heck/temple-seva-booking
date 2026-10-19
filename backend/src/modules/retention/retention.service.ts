import { getDb, IDatabaseClient } from '../../db/index.js';

export interface RetentionPolicy {
  min_retention_days: number;
  policy_name: string;
  description: string;
}

export interface RetentionPreview {
  policy: RetentionPolicy;
  cutoff_date: string;
  eligible_count: number;
  sample_profiles: {
    id: string;
    name: string;
    mobile: string;
    gothra: string;
    last_activity_at: string;
    days_inactive: number;
  }[];
}

export class RetentionService {
  static async getPolicy(client?: IDatabaseClient): Promise<RetentionPolicy> {
    const db = client || await getDb();
    const res = await db.query(`SELECT value FROM temple_settings WHERE key = 'retention_policy'`);
    if (res.rows.length === 0) {
      return {
        min_retention_days: 90,
        policy_name: '90-Day Devotee Profile Retention Policy',
        description: 'Profiles inactive for more than 90 days are eligible for cleanup preview. Historical bookings remain intact.'
      };
    }
    return typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
  }

  static async previewEligible(client?: IDatabaseClient): Promise<RetentionPreview> {
    const db = client || await getDb();
    const policy = await this.getPolicy(db);
    const retentionDays = policy.min_retention_days || 90;

    // Calculate cutoff date
    const cutoffRes = await db.query(
      `SELECT (NOW() - ($1 * INTERVAL '1 day'))::date as cutoff_date`,
      [retentionDays]
    );
    const cutoffDate = cutoffRes.rows[0].cutoff_date;

    // Devotees inactive since cutoff date and active
    const res = await db.query(
      `SELECT id, name, mobile, gothra, last_activity_at::text as last_activity_at,
              EXTRACT(DAY FROM (NOW() - last_activity_at))::int as days_inactive
       FROM devotees
       WHERE profile_status = 'active'
         AND last_activity_at < (NOW() - ($1 * INTERVAL '1 day'))
       ORDER BY last_activity_at ASC`,
      [retentionDays]
    );

    return {
      policy,
      cutoff_date: cutoffDate,
      eligible_count: res.rows.length,
      sample_profiles: res.rows.slice(0, 50)
    };
  }

  static async executeCleanup(adminId: string, notes?: string, client?: IDatabaseClient): Promise<{
    cleaned_count: number;
    cutoff_date: string;
    run_id: string;
  }> {
    const baseDb = client || await getDb();
    const policy = await this.getPolicy(baseDb);
    const retentionDays = policy.min_retention_days || 90;

    return await baseDb.transaction(async (tx) => {
      const cutoffRes = await tx.query(
        `SELECT (NOW() - ($1 * INTERVAL '1 day'))::date as cutoff_date`,
        [retentionDays]
      );
      const cutoffDate = cutoffRes.rows[0].cutoff_date;

      // Select eligible profiles
      const eligibleRes = await tx.query(
        `SELECT id FROM devotees
         WHERE profile_status = 'active'
           AND last_activity_at < (NOW() - ($1 * INTERVAL '1 day'))`,
        [retentionDays]
      );

      const eligibleIds = eligibleRes.rows.map(r => r.id);
      let cleanedCount = 0;

      if (eligibleIds.length > 0) {
        const placeholders = eligibleIds.map((_, i) => `$${i + 1}`).join(',');
        const updateRes = await tx.query(
          `UPDATE devotees
           SET profile_status = 'cleaned_up', updated_at = NOW()
           WHERE id IN (${placeholders})`,
          eligibleIds
        );
        cleanedCount = updateRes.rowCount ?? eligibleIds.length;
      }

      // Record in retention_runs table
      const runRes = await tx.query(
        `INSERT INTO retention_runs (executed_by, cutoff_date, profiles_evaluated, profiles_cleaned, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [adminId, cutoffDate, eligibleIds.length, cleanedCount, notes || 'Authorized manual retention cleanup run']
      );
      const runId = runRes.rows[0].id;

      // Audit log entry
      await tx.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'DATA_CLEANUP_PERFORMED', 'retention', $2, $3)`,
        [
          adminId,
          runId,
          JSON.stringify({
            cutoff_date: cutoffDate,
            cleaned_count: cleanedCount,
            evaluated_count: eligibleIds.length,
            notes: notes || null
          })
        ]
      );

      return {
        cleaned_count: cleanedCount,
        cutoff_date: cutoffDate,
        run_id: runId
      };
    });
  }

  static async listRuns(client?: IDatabaseClient) {
    const db = client || await getDb();
    const res = await db.query(
      `SELECT r.*, su.name as executed_by_name
       FROM retention_runs r
       LEFT JOIN staff_users su ON r.executed_by = su.id
       ORDER BY r.created_at DESC`
    );
    return res.rows;
  }
}
