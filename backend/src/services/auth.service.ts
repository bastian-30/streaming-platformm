import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { signToken, type AuthPayload } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { roleModel } from '../models/role.model.js';
import { userModel, type UserRow } from '../models/user.model.js';

export interface PublicUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  role_id: number;
  created_at: Date;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role_name,
    role_id: row.role_id,
    created_at: row.created_at
  };
}

export interface AuthResult {
  user: PublicUser;
  token: string;
  expiresIn: string;
}

async function issueAuthResult(user: UserRow): Promise<AuthResult> {
  const payload: AuthPayload = {
    sub: user.id,
    email: user.email,
    role: user.role_name,
    roleId: user.role_id
  };
  return {
    user: toPublicUser(user),
    token: signToken(payload),
    expiresIn: env.jwtExpiresIn
  };
}

export const authService = {
  async register(email: string, password: string, displayName?: string): Promise<AuthResult> {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      throw new ApiError(409, 'Ya existe una cuenta con ese email');
    }
    const defaultRole = await roleModel.findByName('collaborator');
    if (!defaultRole) {
      throw new ApiError(500, 'No existe el rol por defecto; ejecuta el esquema de base de datos');
    }
    const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
    const user = await userModel.create({
      email,
      passwordHash,
      displayName: displayName ?? null,
      roleId: defaultRole.id
    });
    return issueAuthResult(user);
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await userModel.findByEmail(email);
    // Mensaje genérico para no revelar si el email existe
    if (!user) throw new ApiError(401, 'Credenciales inválidas');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Credenciales inválidas');
    return issueAuthResult(user);
  },

  async profile(userId: string): Promise<PublicUser> {
    const user = await userModel.findById(userId);
    if (!user) throw new ApiError(404, 'Usuario no encontrado');
    return toPublicUser(user);
  }
};
