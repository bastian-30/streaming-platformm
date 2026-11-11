import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { getUser } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { categoryModel } from '../models/category.model.js';
import { isAdminViewer, type Viewer } from '../models/helpers.js';
import { streamModel, type StreamFilters, type StreamRow } from '../models/stream.model.js';

type StreamStatus = 'scheduled' | 'live' | 'ended';

function viewerFrom(req: Request): Viewer | undefined {
  const user = getUser(req);
  return user ? { id: user.sub, role: user.role } : undefined;
}

function canModify(row: StreamRow, viewer: Viewer | undefined): boolean {
  return isAdminViewer(viewer) || (viewer?.id != null && row.created_by === viewer.id);
}

function ensureVisible(row: StreamRow | null, viewer: Viewer | undefined): StreamRow {
  if (!row) throw new ApiError(404, 'Transmisión no encontrada');
  if (row.visibility === 'private' && !canModify(row, viewer)) {
    throw new ApiError(404, 'Transmisión no encontrada');
  }
  return row;
}

async function assertCategoryExists(categoryId?: number | null): Promise<void> {
  if (categoryId == null) return;
  const category = await categoryModel.findById(categoryId);
  if (!category) throw new ApiError(400, 'La categoría indicada no existe');
}

export const streamService = {
  async list(req: Request, filters: StreamFilters, limit: number, page: number) {
    const offset = (page - 1) * limit;
    return streamModel.list(filters, viewerFrom(req), limit, offset);
  },

  async getById(req: Request, id: string) {
    return ensureVisible(await streamModel.findById(id), viewerFrom(req));
  },

  async create(
    req: Request,
    data: { title: string; stream_id?: string; visibility: 'public' | 'private'; category_id?: number | null }
  ) {
    const viewer = viewerFrom(req);
    if (!viewer?.id) throw new ApiError(401, 'Se requiere autenticación para crear transmisiones');
    await assertCategoryExists(data.category_id);
    return streamModel.create({
      title: data.title,
      // Identificador que se usará luego contra el servidor de streaming (Ant Media)
      streamId: data.stream_id?.trim() || `live-${randomUUID().slice(0, 8)}`,
      visibility: data.visibility,
      createdBy: viewer.id,
      categoryId: data.category_id ?? null
    });
  },

  async update(req: Request, id: string, data: {
    title?: string;
    visibility?: 'public' | 'private';
    category_id?: number | null;
  }) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await streamModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo el creador o un administrador puede editar la transmisión');
    }
    await assertCategoryExists(data.category_id);
    const updated = await streamModel.update(id, data);
    return updated!;
  },

  async changeStatus(req: Request, id: string, status: StreamStatus) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await streamModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo el creador o un administrador puede cambiar el estado');
    }
    const transitions: Record<StreamStatus, StreamStatus[]> = {
      scheduled: ['live', 'ended'],
      live: ['ended'],
      ended: []
    };
    if (!transitions[row.status].includes(status)) {
      throw new ApiError(409, `No se puede pasar de '${row.status}' a '${status}'`);
    }
    const updated = await streamModel.updateStatus(id, status);
    return updated!;
  },

  async remove(req: Request, id: string) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await streamModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo el creador o un administrador puede eliminar la transmisión');
    }
    if (row.status === 'live') {
      throw new ApiError(409, 'Finaliza la transmisión antes de eliminarla');
    }
    await streamModel.remove(id);
  },

  /**
   * URL de reproducción para Ant Media Server.
   * Las transmisiones privadas requieren ser el creador o administrador
   * (regla aplicada por ensureVisible); además solo se expone si está
   * en vivo o finalizada (la reproducción no tiene sentido antes de empezar).
   */
  async getPlayback(req: Request, id: string) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await streamModel.findById(id), viewer);
    const base = env.antMediaBaseUrl.replace(/\/$/, '');
    return {
      id: row.id,
      title: row.title,
      stream_id: row.stream_id,
      status: row.status,
      visibility: row.visibility,
      playback_url: `${base}/streams/${row.stream_id}.m3u8`,
      webrtc_url: `${base}/streams/${row.stream_id}?autoplay=true`,
      note: 'URLs preparadas para Ant Media Server; el servidor de streaming se habilita al desplegar el contenedor antmedia.'
    };
  }
};
