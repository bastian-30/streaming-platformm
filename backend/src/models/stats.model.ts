import { pool } from '../database/client.js';

export interface StatsOverview {
  users: number;
  posts: number;
  media: number;
  categories: number;
  streams: number;
  streams_live: number;
  storage_bytes: number;
}

export interface CountByLabel {
  label: string;
  total: number;
}

export const statsModel = {
  async overview(): Promise<StatsOverview> {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM posts) AS posts,
        (SELECT COUNT(*)::int FROM media) AS media,
        (SELECT COUNT(*)::int FROM categories) AS categories,
        (SELECT COUNT(*)::int FROM live_streams) AS streams,
        (SELECT COUNT(*)::int FROM live_streams WHERE status = 'live') AS streams_live,
        (SELECT COALESCE(SUM(file_size), 0)::bigint FROM media) AS storage_bytes
    `);
    return result.rows[0];
  },

  async mediaByType(): Promise<CountByLabel[]> {
    const result = await pool.query(
      `SELECT media_type AS label, COUNT(*)::int AS total FROM media GROUP BY media_type ORDER BY total DESC`
    );
    return result.rows;
  },

  async streamsByStatus(): Promise<CountByLabel[]> {
    const result = await pool.query(
      `SELECT status AS label, COUNT(*)::int AS total FROM live_streams GROUP BY status ORDER BY total DESC`
    );
    return result.rows;
  },

  async postsByVisibility(): Promise<CountByLabel[]> {
    const result = await pool.query(
      `SELECT visibility AS label, COUNT(*)::int AS total FROM posts GROUP BY visibility ORDER BY total DESC`
    );
    return result.rows;
  }
};
