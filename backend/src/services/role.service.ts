import { ApiError } from '../middleware/errorHandler.js';
import { roleModel } from '../models/role.model.js';

const SYSTEM_ROLES = ['admin', 'collaborator'];

export const roleService = {
  async list() {
    return roleModel.list();
  },

  async create(name: string) {
    const existing = await roleModel.findByName(name);
    if (existing) throw new ApiError(409, 'Ya existe un rol con ese nombre');
    return roleModel.create(name);
  },

  async update(id: number, name: string) {
    const role = await roleModel.findById(id);
    if (!role) throw new ApiError(404, 'Rol no encontrado');
    const existing = await roleModel.findByName(name);
    if (existing && existing.id !== id) throw new ApiError(409, 'Ya existe un rol con ese nombre');
    const updated = await roleModel.update(id, name);
    return updated!;
  },

  async remove(id: number) {
    const role = await roleModel.findById(id);
    if (!role) throw new ApiError(404, 'Rol no encontrado');
    if (SYSTEM_ROLES.includes(role.name)) {
      throw new ApiError(409, 'No se puede eliminar un rol del sistema');
    }
    const roles = await roleModel.list();
    const usage = roles.find((r) => r.id === id)?.user_count ?? 0;
    if (usage > 0) {
      throw new ApiError(409, 'No se puede eliminar un rol asignado a usuarios');
    }
    await roleModel.remove(id);
  }
};
