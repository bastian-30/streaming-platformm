import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `Ruta no encontrada: ${req.method} ${req.path}` } });
};

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details: unknown;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 422;
    message = 'Datos de entrada inválidos';
    details = error.flatten().fieldErrors;
  } else if (error instanceof MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `El archivo supera el tamaño máximo permitido`
        : `Error al subir el archivo: ${error.message}`;
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      statusCode = 409;
      message = 'Ya existe un registro con esos datos únicos';
    } else if (code === '23503') {
      statusCode = 400;
      message = 'Referencia inválida: el recurso relacionado no existe';
    } else if (code === '22P02' || code === '23514') {
      statusCode = 400;
      message = 'Valor inválido para la base de datos';
    }
  } else if (error instanceof SyntaxError && 'body' in (error as object)) {
    statusCode = 400;
    message = 'JSON malformado en el cuerpo de la petición';
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (statusCode >= 500) {
    console.error('Error no controlado en la API:', error);
    if (process.env.NODE_ENV === 'production') {
      message = 'Error interno del servidor';
      details = undefined;
    }
  }

  res.status(statusCode).json({ error: { message, ...(details ? { details } : {}) } });
}
