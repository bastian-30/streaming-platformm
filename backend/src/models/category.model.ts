import { pool } from '../database/client.js';

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  post_count?: number;
  media_count?: number;
  stream_count?: number;
}

export const categoryModel = {
  async list(): Promise<CategoryRow[]> {
    const result = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.created_at,
              (SELECT COUNT(*)::int FROM posts p WHERE p.category_id = c.id) AS post_count,
              (SELECT COUNT(*)::int FROM media m WHERE m.category_id = c.id) AS media_count,
              (SELECT COUNT(*)::int FROM live_streams s WHERE s.category_id = c.id) AS stream_count
       FROM categories c
       ORDER BY c.name`
    );
    return result.rows;
  },

  async findById(id: number): Promise<CategoryRow | null> {
    const result = await pool.query(
      `SELECT id, name, slug, description, created_at FROM categories WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async existsByNameOrSlug(name: string, slug: string): Promise<CategoryRow | null> {
    const result = await pool.query(
      `SELECT id, name, slug, description, created_at FROM categories WHERE name = $1 OR slug = $2`,
      [name, slug]
    );
    return result.rows[0] ?? null;
  },

  async create(data: { name: string; slug: string; description?: string }): Promise<CategoryRow> {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3) RETURNING id, name, slug, description, created_at`,
      [data.name, data.slug, data.description ?? null]
    );
    return result.rows[0];
  },

  async update(id: number, fields: { name?: string; slug?: string; description?: string }): Promise<CategoryRow | null> {
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
    const result = await pool.query(
      `UPDATE categories SET ${set} WHERE id = $${values.length} RETURNING id, name, slug, description, created_at`,
      values
    );
    return result.rows[0] ?? null;
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
};
