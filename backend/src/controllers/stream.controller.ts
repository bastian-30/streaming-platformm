import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { activityLog } from '../services/activity.service.js';
import { streamService } from '../services/stream.service.js';
import { createStreamSchema, streamListQuery, streamStatusSchema, updateStreamSchema } from '../validators/stream.schema.js';
import { uuidParam } from '../validators/common.schema.js';

export const listStreams = asyncHandler(async (req: Request, res: Response) => {
  const query = streamListQuery.parse(req.query);
  const streams = await streamService.list(req, query, query.limit, query.page);
  res.json(streams);
});

export const getStream = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const stream = await streamService.getById(req, id);
  res.json(stream);
});

export const createStream = asyncHandler(async (req: Request, res: Response) => {
  const data = createStreamSchema.parse(req.body);
  const stream = await streamService.create(req, data);
  await activityLog.recordRequest(req, {
    action: 'stream.create',
    resource: 'streams',
    resourceId: stream.id,
    details: { title: stream.title, visibility: stream.visibility }
  });
  res.status(201).json(stream);
});

export const updateStream = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const data = updateStreamSchema.parse(req.body);
  const stream = await streamService.update(req, id, data);
  await activityLog.recordRequest(req, {
    action: 'stream.update',
    resource: 'streams',
    resourceId: id,
    details: { fields: Object.keys(data) }
  });
  res.json(stream);
});

export const changeStreamStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const { status } = streamStatusSchema.parse(req.body);
  const stream = await streamService.changeStatus(req, id, status);
  await activityLog.recordRequest(req, {
    action: 'stream.status',
    resource: 'streams',
    resourceId: id,
    details: { status }
  });
  res.json(stream);
});

export const deleteStream = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  await streamService.remove(req, id);
  await activityLog.recordRequest(req, { action: 'stream.delete', resource: 'streams', resourceId: id });
  res.status(204).send();
});

/**
 * Devuelve la URL de reproducción (HLS/WebRTC vía Ant Media Server).
 * Las transmisiones privadas solo son accesibles para su creador o un administrador.
 */
export const getStreamPlayback = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const playback = await streamService.getPlayback(req, id);
  await activityLog.recordRequest(req, {
    action: 'stream.playback',
    resource: 'streams',
    resourceId: id,
    details: { visibility: playback.visibility }
  });
  res.json(playback);
});
