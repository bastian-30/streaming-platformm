import type { Request } from 'express';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { getUser, type AuthPayload } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { roleModel } from '../models/role.model.js';
import { userModel } from '../models/user.model.js';
import { toPublicUser } from './auth.service.js';

const viewerFrom = (req: Request): AuthPayload | undefined => getUser(req);

export const userService = {
  async list() {
    const users = await userModel.list();
    return users.map(toPublicUser);
  },

  async getById(req: Request, id: string) {
    const viewer = viewerFrom(req);
    if (viewer?.role !== 'admin' && viewer?.sub !== id) {
      throw new ApiError(403, 'Solo puedes consultar tu propio perfil o ser administrador');
    }
    const user = await userModel.findById(id);
    if (!user) throw new ApiError(404, 'Usuario no encontrado');
    return toPublicUser(user);
  },

  async update(
    req: Request,
    id: string,
    data: { display_name?: string; password?: string; email?: string; role_id?: number }
  ) {
    const viewer = viewerFrom(req);
    const isAdmin = viewer?.role === 'admin';
    if (!isAdmin && viewer?.sub !== id) {
      throw new ApiError(403, 'Solo puedes actualizar tu propio perfil');
    }
    const target = await userModel.findById(id);
    if (!target) throw new ApiError(404, 'Usuario no encontrado');

    const fields: Parameters<typeof userModel.update>[1] = {};
    if (data.display_name !== undefined) fields.display_name = data.display_name;
    if (data.password !== undefined) {
      fields.password_hash = await bcrypt.hash(data.password, env.bcryptRounds);
    }
    if (!isAdmin) {
      // Un usuario sin permisos de administración no puede cambiar email ni rol
      if (data.email !== undefined || data.role_id !== undefined) {
        throw new ApiError(403, 'No puedes modificar el email o el rol de otra cuenta');
      }
    } else {
      if (data.email !== undefined) {
        const existing = await userModel.findByEmail(data.email);
        if (existing && existing.id !== id) throw new ApiError(409, 'El email ya está en uso');
        fields.email = data.email;
      }
      if (data.role_id !== undefined) {
        const role = await roleModel.findById(data.role_id);
        if (!role) throw new ApiError(400, 'El rol indicado no existe');
        const admins = await userModel.list();
        const adminCount = admins.filter((u) => u.role_name === 'admin').length;
        if (target.role_name === 'admin' && role.name !== 'admin' && adminCount <= 1) {
          throw new ApiError(409, 'No se puede dejar la plataforma sin administradores');
        }
        fields.role_id = data.role_id;
      }
    }

    const updated = await userModel.update(id, fields);
    return toPublicUser(updated!);
  },

  async remove(req: Request, id: string) {
    const viewer = viewerFrom(req);
    if (viewer?.sub === id) {
      throw new ApiError(409, 'No puedes eliminar tu propia cuenta mientras la usas');
    }
    const target = await userModel.findById(id);
    if (!target) throw new ApiError(404, 'Usuario no encontrado');
    if (target.role_name === 'admin') {
      const users = await userModel.list();
      const adminCount = users.filter((u) => u.role_name === 'admin').length;
      if (adminCount <= 1) {
        throw new ApiError(409, 'No se puede eliminar el último administrador');
      }
    }
    await userModel.remove(id);
  }
};
