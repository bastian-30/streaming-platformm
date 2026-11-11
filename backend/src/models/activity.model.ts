import { pool } from '../database/client.js';

export interface ActivityLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  ip: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}

export interface NewActivityLog {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resource?: string;
  resourceId?: string | number | null;
  ip?: string | null;
  details?: Record<string, unknown>;
}

export const activityModel = {
  async create(log: NewActivityLog): Promise<void> {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_email, action, resource, resource_id, ip, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        log.userId ?? null,
        log.userEmail ?? null,
        log.action,
        log.resource ?? null,
        log.resourceId != null ? String(log.resourceId) : null,
        log.ip ?? null,
        log.details ? JSON.stringify(log.details) : null
      ]
    );
  },

  async list(limit: number, offset: number): Promise<ActivityLogRow[]> {
    const result = await pool.query(
      `SELECT id, user_id, user_email, action, resource, resource_id, ip, details, created_at
       FROM activity_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async countByAction(): Promise<{ action: string; total: number }[]> {
    const result = await pool.query(
      `SELECT action, COUNT(*)::int AS total FROM activity_logs GROUP BY action ORDER BY total DESC`
    );
    return result.rows;
  }
};
