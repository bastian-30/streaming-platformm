import { pool } from '../database/client.js';
import { visibilityCondition, type Viewer } from './helpers.js';

export interface PostRow {
  id: string;
  title: string;
  body: string;
  visibility: 'public' | 'private';
  author_id: string | null;
  author_name: string | null;
  category_id: number | null;
  category_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PostFilters {
  visibility?: 'public' | 'private';
  categoryId?: number | null;
}

const SELECT = `
  SELECT p.id, p.title, p.body, p.visibility, p.author_id,
         COALESCE(u.display_name, u.email) AS author_name,
         p.category_id, c.name AS category_name,
         p.created_at, p.updated_at
  FROM posts p
  LEFT JOIN users u ON u.id = p.author_id
  LEFT JOIN categories c ON c.id = p.category_id
`;

export const postModel = {
  async list(filters: PostFilters, viewer: Viewer | undefined, limit: number, offset: number): Promise<PostRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    visibilityCondition(viewer, 'p.visibility', 'p.author_id', conditions, params);
    if (filters.visibility) {
      params.push(filters.visibility);
      conditions.push(`p.visibility = $${params.length}`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const result = await pool.query(
      `${SELECT} ${where} ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  },

  async findById(id: string): Promise<PostRow | null> {
    const result = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(data: {
    title: string;
    body: string;
    visibility: 'public' | 'private';
    authorId: string | null;
    categoryId?: number | null;
  }): Promise<PostRow> {
    const result = await pool.query(
      `INSERT INTO posts (title, body, visibility, author_id, category_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [data.title, data.body, data.visibility, data.authorId, data.categoryId ?? null]
    );
    return (await this.findById(result.rows[0].id))!;
  },

  async update(id: string, fields: {
    title?: string;
    body?: string;
    visibility?: 'public' | 'private';
    category_id?: number | null;
  }): Promise<PostRow | null> {
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return this.findById(id);
    const values: unknown[] = [];
    const set = entries
      .map(([key, value]) => {
        values.push(value);
        return `${key} = $${values.length}`;
      })
      .concat('updated_at = NOW()')
      .join(', ');
    values.push(id);
    await pool.query(`UPDATE posts SET ${set} WHERE id = $${values.length}`, values);
    return this.findById(id);
  },

  async remove(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM posts WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
};
