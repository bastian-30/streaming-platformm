import { pool } from '../database/client.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role_id: number;
  role_name: string;
  created_at: Date;
  updated_at: Date;
}

const SELECT = `
  SELECT u.id, u.email, u.password_hash, u.display_name, u.role_id,
         r.name AS role_name, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

export const userModel = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query(`${SELECT} WHERE u.email = $1`, [email]);
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const result = await pool.query(`${SELECT} WHERE u.id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async list(): Promise<UserRow[]> {
    const result = await pool.query(`${SELECT} ORDER BY u.created_at DESC`);
    return result.rows;
  },

  async create(data: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
    roleId: number;
  }): Promise<UserRow> {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.email, data.passwordHash, data.displayName ?? null, data.roleId]
    );
    return (await this.findById(result.rows[0].id))!;
  },

  async update(id: string, fields: {
    email?: string;
    password_hash?: string;
    display_name?: string | null;
    role_id?: number;
  }): Promise<UserRow | null> {
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return this.findById(id);
    const values: unknown[] = [];
    const set = entries
      .map(([key, value]) => {
        values.push(value);
        return `${key} = $${values.length}`;
      })
      .concat(`updated_at = NOW()`)
      .join(', ');
    values.push(id);
    await pool.query(`UPDATE users SET ${set} WHERE id = $${values.length}`, values);
    return this.findById(id);
  },

  async remove(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
};
