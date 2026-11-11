import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { activityLog } from '../services/activity.service.js';
import { userService } from '../services/user.service.js';
import { updateUserSchema, uuidParam } from '../validators/common.schema.js';

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.list();
  res.json(users);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const user = await userService.getById(req, id);
  res.json(user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const data = updateUserSchema.parse(req.body);
  const user = await userService.update(req, id, data);
  await activityLog.recordRequest(req, {
    action: 'user.update',
    resource: 'users',
    resourceId: id,
    details: { fields: Object.keys(data) }
  });
  res.json(user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  await userService.remove(req, id);
  await activityLog.recordRequest(req, { action: 'user.delete', resource: 'users', resourceId: id });
  res.status(204).send();
});
