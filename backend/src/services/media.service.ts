import type { Request } from 'express';
import { getUser } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { categoryModel } from '../models/category.model.js';
import { isAdminViewer, type Viewer } from '../models/helpers.js';
import { mediaModel, type MediaFilters, type MediaRow } from '../models/media.model.js';
import { mediaTypeFromMime } from '../middleware/upload.js';
import { absoluteStoredPath, deleteStoredFile } from './file.service.js';

function viewerFrom(req: Request): Viewer | undefined {
  const user = getUser(req);
  return user ? { id: user.sub, role: user.role } : undefined;
}

function canModify(row: MediaRow, viewer: Viewer | undefined): boolean {
  return isAdminViewer(viewer) || (viewer?.id != null && row.uploaded_by === viewer.id);
}

function ensureVisible(row: MediaRow | null, viewer: Viewer | undefined): MediaRow {
  if (!row) throw new ApiError(404, 'Archivo multimedia no encontrado');
  if (row.visibility === 'private' && !canModify(row, viewer)) {
    throw new ApiError(404, 'Archivo multimedia no encontrado');
  }
  return row;
}

export const mediaService = {
  async list(req: Request, filters: MediaFilters, limit: number, page: number) {
    const offset = (page - 1) * limit;
    return mediaModel.list(filters, viewerFrom(req), limit, offset);
  },

  async getById(req: Request, id: string) {
    return ensureVisible(await mediaModel.findById(id), viewerFrom(req));
  },

  async createFromUpload(
    req: Request,
    file: Express.Multer.File,
    data: { title: string; visibility: 'public' | 'private'; category_id?: number | null }
  ) {
    const viewer = viewerFrom(req);
    if (!viewer?.id) throw new ApiError(401, 'Se requiere autenticación para subir archivos');
    if (!file) throw new ApiError(400, 'Debes adjuntar un archivo en el campo "file"');
    if (data.category_id != null) {
      const category = await categoryModel.findById(data.category_id);
      if (!category) throw new ApiError(400, 'La categoría indicada no existe');
    }
    const media = await mediaModel.create({
      title: data.title,
      mediaType: mediaTypeFromMime(file.mimetype),
      // Se guarda la ruta relativa al directorio de subidas
      filePath: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      visibility: data.visibility,
      uploadedBy: viewer.id,
      categoryId: data.category_id ?? null
    });
    return media;
  },

  async update(req: Request, id: string, data: {
    title?: string;
    visibility?: 'public' | 'private';
    category_id?: number | null;
  }) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await mediaModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo quien subió el archivo o un administrador puede editarlo');
    }
    if (data.category_id != null) {
      const category = await categoryModel.findById(data.category_id);
      if (!category) throw new ApiError(400, 'La categoría indicada no existe');
    }
    const updated = await mediaModel.update(id, data);
    return updated!;
  },

  async remove(req: Request, id: string) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await mediaModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo quien subió el archivo o un administrador puede eliminarlo');
    }
    await mediaModel.remove(id);
    await deleteStoredFile(row.file_path);
  },

  /** Ruta absoluta para servir el archivo con control de permisos. */
  async getFile(req: Request, id: string): Promise<{ absolutePath: string; mimeType: string }> {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await mediaModel.findById(id), viewer);
    return { absolutePath: absoluteStoredPath(row.file_path), mimeType: row.mime_type };
  }
};
