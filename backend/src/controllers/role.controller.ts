import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { activityLog } from '../services/activity.service.js';
import { roleService } from '../services/role.service.js';
import { createRoleSchema, updateRoleSchema } from '../validators/role.schema.js';
import { intIdParam } from '../validators/common.schema.js';

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await roleService.list();
  res.json(roles);
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const data = createRoleSchema.parse(req.body);
  const role = await roleService.create(data.name);
  await activityLog.recordRequest(req, { action: 'role.create', resource: 'roles', resourceId: role.id });
  res.status(201).json(role);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = intIdParam.parse(req.params);
  const data = updateRoleSchema.parse(req.body);
  const role = await roleService.update(id, data.name);
  await activityLog.recordRequest(req, { action: 'role.update', resource: 'roles', resourceId: id });
  res.json(role);
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = intIdParam.parse(req.params);
  await roleService.remove(id);
  await activityLog.recordRequest(req, { action: 'role.delete', resource: 'roles', resourceId: id });
  res.status(204).send();
});
