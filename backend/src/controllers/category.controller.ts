import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { activityLog } from '../services/activity.service.js';
import { categoryService } from '../services/category.service.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.schema.js';
import { intIdParam } from '../validators/common.schema.js';

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.list();
  res.json(categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = createCategorySchema.parse(req.body);
  const category = await categoryService.create(data);
  await activityLog.recordRequest(req, { action: 'category.create', resource: 'categories', resourceId: category.id });
  res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = intIdParam.parse(req.params);
  const data = updateCategorySchema.parse(req.body);
  const category = await categoryService.update(id, data);
  await activityLog.recordRequest(req, {
    action: 'category.update',
    resource: 'categories',
    resourceId: id,
    details: { fields: Object.keys(data) }
  });
  res.json(category);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = intIdParam.parse(req.params);
  await categoryService.remove(id);
  await activityLog.recordRequest(req, { action: 'category.delete', resource: 'categories', resourceId: id });
  res.status(204).send();
});
