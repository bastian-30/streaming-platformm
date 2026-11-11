import { pool } from '../database/client.js';
import { visibilityCondition, type Viewer } from './helpers.js';

export interface StreamRow {
  id: string;
  title: string;
  stream_id: string | null;
  status: 'scheduled' | 'live' | 'ended';
  visibility: 'public' | 'private';
  category_id: number | null;
  category_name: string | null;
  created_by: string | null;
  creator_name: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
}

export interface StreamFilters {
  status?: 'scheduled' | 'live' | 'ended';
  visibility?: 'public' | 'private';
}

const SELECT = `
  SELECT s.id, s.title, s.stream_id, s.status, s.visibility,
         s.category_id, c.name AS category_name,
         s.created_by, COALESCE(u.display_name, u.email) AS creator_name,
         s.started_at, s.ended_at, s.created_at
  FROM live_streams s
  LEFT JOIN categories c ON c.id = s.category_id
  LEFT JOIN users u ON u.id = s.created_by
`;

export const streamModel = {
  async list(filters: StreamFilters, viewer: Viewer | undefined, limit: number, offset: number): Promise<StreamRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    visibilityCondition(viewer, 's.visibility', 's.created_by', conditions, params);
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (filters.visibility) {
      params.push(filters.visibility);
      conditions.push(`s.visibility = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const result = await pool.query(
      `${SELECT} ${where} ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  },

  async findById(id: string): Promise<StreamRow | null> {
    const result = await pool.query(`${SELECT} WHERE s.id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(data: {
    title: string;
    streamId: string;
    visibility: 'public' | 'private';
    createdBy: string | null;
    categoryId?: number | null;
  }): Promise<StreamRow> {
    const result = await pool.query(
      `INSERT INTO live_streams (title, stream_id, visibility, created_by, category_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [data.title, data.streamId, data.visibility, data.createdBy, data.categoryId ?? null]
    );
    return (await this.findById(result.rows[0].id))!;
  },

  async update(id: string, fields: {
    title?: string;
    visibility?: 'public' | 'private';
    category_id?: number | null;
  }): Promise<StreamRow | null> {
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return this.findById(id);
    const values: unknown[] = [];
    const set = entries
      .map(([key, value]) => {
        values.push(value);
        return `${key} = $${values.length}`;
      })
      .join(', ');
    values.push(id);
    await pool.query(`UPDATE live_streams SET ${set} WHERE id = $${values.length}`, values);
    return this.findById(id);
  },

  async updateStatus(id: string, status: 'scheduled' | 'live' | 'ended'): Promise<StreamRow | null> {
    const result = await pool.query(
      `UPDATE live_streams
       SET status = $2::varchar,
           started_at = CASE WHEN $2::varchar = 'live' THEN NOW() ELSE started_at END,
           ended_at = CASE WHEN $2::varchar = 'ended' THEN NOW() ELSE ended_at END
       WHERE id = $1
       RETURNING id`,
      [id, status]
    );
    return result.rows[0] ? this.findById(id) : null;
  },

  async remove(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM live_streams WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
};
