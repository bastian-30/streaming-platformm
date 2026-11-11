import type { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { mediaService } from '../services/media.service.js';
import { upload } from '../middleware/upload.js';
import { activityLog } from '../services/activity.service.js';
import { mediaListQuery, updateMediaSchema } from '../validators/media.schema.js';
import { uuidParam } from '../validators/common.schema.js';

const uploadMiddleware = upload.single('file');

/** Envuelve multer para convertir sus errores al manejo centralizado. */
export const uploadMediaFile = (req: Request, res: Response, next: (err?: unknown) => void) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return next(err instanceof Error ? err : new ApiError(400, 'Error al procesar el archivo'));
    next();
  });
};

export const listMedia = asyncHandler(async (req: Request, res: Response) => {
  const query = mediaListQuery.parse(req.query);
  const items = await mediaService.list(req, query, query.limit, query.page);
  res.json(items);
});

export const getMedia = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const media = await mediaService.getById(req, id);
  res.json(media);
});

export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  const visibility = req.body.visibility === 'private' ? 'private' : 'public';
  const categoryRaw = req.body.category_id;
  const data = {
    title: typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : req.file?.originalname ?? 'Sin título',
    visibility: visibility as 'public' | 'private',
    category_id: categoryRaw ? Number(categoryRaw) : null
  };
  if (data.title.length > 200) {
    throw new ApiError(422, 'El título no puede superar 200 caracteres');
  }
  if (data.category_id != null && (Number.isNaN(data.category_id) || !Number.isInteger(data.category_id))) {
    throw new ApiError(422, 'category_id debe ser un número entero');
  }
  const media = await mediaService.createFromUpload(req, req.file!, data);
  await activityLog.recordRequest(req, {
    action: 'media.upload',
    resource: 'media',
    resourceId: media.id,
    details: { title: media.title, media_type: media.media_type, file_size: Number(media.file_size) }
  });
  res.status(201).json(media);
});

export const getMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const { absolutePath, mimeType } = await mediaService.getFile(req, id);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(absolutePath);
});

export const updateMedia = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const data = updateMediaSchema.parse(req.body);
  const media = await mediaService.update(req, id, data);
  await activityLog.recordRequest(req, {
    action: 'media.update',
    resource: 'media',
    resourceId: id,
    details: { fields: Object.keys(data) }
  });
  res.json(media);
});

export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  await mediaService.remove(req, id);
  await activityLog.recordRequest(req, { action: 'media.delete', resource: 'media', resourceId: id });
  res.status(204).send();
});
