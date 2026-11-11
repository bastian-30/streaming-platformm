import { pool } from '../database/client.js';

export interface RoleRow {
  id: number;
  name: string;
  user_count?: number;
}

export const roleModel = {
  async list(): Promise<RoleRow[]> {
    const result = await pool.query(
      `SELECT r.id, r.name, COUNT(u.id)::int AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       GROUP BY r.id, r.name
       ORDER BY r.id`
    );
    return result.rows;
  },

  async findById(id: number): Promise<RoleRow | null> {
    const result = await pool.query(`SELECT id, name FROM roles WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async findByName(name: string): Promise<RoleRow | null> {
    const result = await pool.query(`SELECT id, name FROM roles WHERE name = $1`, [name]);
    return result.rows[0] ?? null;
  },

  async create(name: string): Promise<RoleRow> {
    const result = await pool.query(`INSERT INTO roles (name) VALUES ($1) RETURNING id, name`, [name]);
    return result.rows[0];
  },

  async update(id: number, name: string): Promise<RoleRow | null> {
    const result = await pool.query(
      `UPDATE roles SET name = $2 WHERE id = $1 RETURNING id, name`,
      [id, name]
    );
    return result.rows[0] ?? null;
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query(`DELETE FROM roles WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
};
