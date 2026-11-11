import { pool } from '../database/client.js';
import { visibilityCondition, type Viewer } from './helpers.js';

export interface MediaRow {
  id: string;
  title: string;
  media_type: 'video' | 'audio' | 'image';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  visibility: 'public' | 'private';
  category_id: number | null;
  category_name: string | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  created_at: Date;
}

export interface MediaFilters {
  mediaType?: 'video' | 'audio' | 'image';
  visibility?: 'public' | 'private';
  categoryId?: number | null;
}

const SELECT = `
  SELECT m.id, m.title, m.media_type, m.file_path,
         split_part(m.file_path, '/', -1) AS file_name,
         m.file_size, m.mime_type, m.visibility,
         m.category_id, c.name AS category_name,
         m.uploaded_by, COALESCE(u.display_name, u.email) AS uploader_name,
         m.created_at
  FROM media m
  LEFT JOIN categories c ON c.id = m.category_id
  LEFT JOIN users u ON u.id = m.uploaded_by
`;

export const mediaModel = {
  async list(filters: MediaFilters, viewer: Viewer | undefined, limit: number, offset: number): Promise<MediaRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    visibilityCondition(viewer, 'm.visibility', 'm.uploaded_by', conditions, params);
    if (filters.mediaType) {
      params.push(filters.mediaType);
      conditions.push(`m.media_type = $${params.length}`);
    }
    if (filters.visibility) {
      params.push(filters.visibility);
      conditions.push(`m.visibility = $${params.length}`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(`m.category_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const result = await pool.query(
      `${SELECT} ${where} ORDER BY m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  },

  async findById(id: string): Promise<MediaRow | null> {
    const result = await pool.query(`${SELECT} WHERE m.id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(data: {
    title: string;
    mediaType: 'video' | 'audio' | 'image';
    filePath: string;
    fileSize: number;
    mimeType: string;
    visibility: 'public' | 'private';
    uploadedBy: string | null;
    categoryId?: number | null;
  }): Promise<MediaRow> {
    const result = await pool.query(
      `INSERT INTO media (title, media_type, file_path, file_size, mime_type, visibility, uploaded_by, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        data.title,
        data.mediaType,
        data.filePath,
        data.fileSize,
        data.mimeType,
        data.visibility,
        data.uploadedBy,
        data.categoryId ?? null
      ]
    );
    return (await this.findById(result.rows[0].id))!;
  },

  async update(id: string, fields: {
    title?: string;
    visibility?: 'public' | 'private';
    category_id?: number | null;
  }): Promise<MediaRow | null> {
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
    await pool.query(`UPDATE media SET ${set} WHERE id = $${values.length}`, values);
    return this.findById(id);
  },

  async remove(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM media WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
};
