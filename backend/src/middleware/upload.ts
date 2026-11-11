import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from './errorHandler.js';

// Tipos MIME permitidos por clase de contenido (la extensión se deriva del MIME,
// nunca del nombre original del archivo)
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.weba'
};

export const uploadDir = path.isAbsolute(env.uploadDir)
  ? env.uploadDir
  : path.resolve(process.cwd(), env.uploadDir);

mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, uploadDir);
  },
  filename(_req, file, callback) {
    const extension = ALLOWED_MIME[file.mimetype];
    if (!extension) {
      return callback(new ApiError(415, `Tipo de archivo no permitido: ${file.mimetype}`), '');
    }
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (ALLOWED_MIME[file.mimetype]) {
    return callback(null, true);
  }
  callback(new ApiError(415, `Tipo de archivo no permitido: ${file.mimetype}`));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 1
  }
});

export function mediaTypeFromMime(mime: string): 'video' | 'audio' | 'image' {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'image';
}
