import type { Request } from 'express';
import { getUser } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { categoryModel } from '../models/category.model.js';
import { postModel, type PostFilters, type PostRow } from '../models/post.model.js';
import { isAdminViewer, type Viewer } from '../models/helpers.js';

function viewerFrom(req: Request): Viewer | undefined {
  const user = getUser(req);
  return user ? { id: user.sub, role: user.role } : undefined;
}

function canModify(row: PostRow, viewer: Viewer | undefined): boolean {
  return isAdminViewer(viewer) || (viewer?.id != null && row.author_id === viewer.id);
}

/** Devuelve la fila si el visitante puede verla; si es privada y ajena, responde 404. */
function ensureVisible(row: PostRow | null, viewer: Viewer | undefined): PostRow {
  if (!row) throw new ApiError(404, 'Publicación no encontrada');
  if (row.visibility === 'private' && !canModify(row, viewer)) {
    throw new ApiError(404, 'Publicación no encontrada');
  }
  return row;
}

async function assertCategoryExists(categoryId?: number | null): Promise<void> {
  if (categoryId == null) return;
  const category = await categoryModel.findById(categoryId);
  if (!category) throw new ApiError(400, 'La categoría indicada no existe');
}

export const postService = {
  async list(req: Request, filters: PostFilters, limit: number, page: number) {
    const offset = (page - 1) * limit;
    return postModel.list(filters, viewerFrom(req), limit, offset);
  },

  async getById(req: Request, id: string) {
    return ensureVisible(await postModel.findById(id), viewerFrom(req));
  },

  async create(
    req: Request,
    data: { title: string; body: string; visibility: 'public' | 'private'; category_id?: number | null }
  ) {
    const viewer = viewerFrom(req);
    if (!viewer?.id) throw new ApiError(401, 'Se requiere autenticación para publicar');
    await assertCategoryExists(data.category_id);
    return postModel.create({
      title: data.title,
      body: data.body,
      visibility: data.visibility,
      authorId: viewer.id,
      categoryId: data.category_id ?? null
    });
  },

  async update(req: Request, id: string, data: {
    title?: string;
    body?: string;
    visibility?: 'public' | 'private';
    category_id?: number | null;
  }) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await postModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo el autor o un administrador puede editar esta publicación');
    }
    await assertCategoryExists(data.category_id);
    const updated = await postModel.update(id, data);
    return updated!;
  },

  async remove(req: Request, id: string) {
    const viewer = viewerFrom(req);
    const row = ensureVisible(await postModel.findById(id), viewer);
    if (!canModify(row, viewer)) {
      throw new ApiError(403, 'Solo el autor o un administrador puede eliminar esta publicación');
    }
    await postModel.remove(id);
  }
};
