import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './errorHandler.js';

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
  roleId: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn']
  });
}

function parseBearer(token: string): AuthPayload {
  const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & Partial<AuthPayload>;
  if (!payload.sub || !payload.role) {
    throw new Error('payload incompleto');
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email ?? ''),
    role: payload.role,
    roleId: Number(payload.roleId ?? 0)
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Se requiere un token de acceso (Bearer)'));
  }
  try {
    const payload = parseBearer(header.slice(7));
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    next(new ApiError(401, 'Token inválido o expirado'));
  }
};

/** Autenticación opcional: si hay token válido se usa; si no, la petición sigue como anónima. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = parseBearer(header.slice(7));
      (req as AuthenticatedRequest).user = payload;
    } catch {
      // Token inválido en una ruta pública: se ignora y se actúa como visitante
    }
  }
  next();
};

export function requireRole(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return next(new ApiError(401, 'Se requiere autenticación'));
    if (!roles.includes(user.role)) {
      return next(new ApiError(403, 'No tienes permisos para realizar esta acción'));
    }
    next();
  };
}

export function getUser(req: Request): AuthPayload | undefined {
  return (req as AuthenticatedRequest).user;
}
