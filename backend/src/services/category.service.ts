import { ApiError } from '../middleware/errorHandler.js';
import { categoryModel } from '../models/category.model.js';

export const categoryService = {
  async list() {
    return categoryModel.list();
  },

  async create(data: { name: string; slug: string; description?: string }) {
    const existing = await categoryModel.existsByNameOrSlug(data.name, data.slug);
    if (existing) throw new ApiError(409, 'Ya existe una categoría con ese nombre o slug');
    return categoryModel.create(data);
  },

  async update(id: number, data: { name?: string; slug?: string; description?: string }) {
    const category = await categoryModel.findById(id);
    if (!category) throw new ApiError(404, 'Categoría no encontrada');
    const conflicting =
      (data.name !== undefined || data.slug !== undefined)
        ? await categoryModel.existsByNameOrSlug(data.name ?? category.name, data.slug ?? category.slug)
        : null;
    if (conflicting && conflicting.id !== id) {
      throw new ApiError(409, 'Ya existe una categoría con ese nombre o slug');
    }
    const updated = await categoryModel.update(id, data);
    return updated!;
  },

  async remove(id: number) {
    const category = await categoryModel.findById(id);
    if (!category) throw new ApiError(404, 'Categoría no encontrada');
    const usage = await categoryModel.list();
    const current = usage.find((c) => c.id === id);
    const inUse =
      (current?.post_count ?? 0) + (current?.media_count ?? 0) + (current?.stream_count ?? 0) > 0;
    if (inUse) {
      throw new ApiError(409, 'No se puede eliminar una categoría con contenido asociado');
    }
    await categoryModel.remove(id);
  }
};
