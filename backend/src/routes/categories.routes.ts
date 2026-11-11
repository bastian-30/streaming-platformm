import { Router } from 'express';
import * as controller from '../controllers/category.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', controller.listCategories);
categoriesRouter.post('/', requireAuth, requireRole('admin'), controller.createCategory);
categoriesRouter.put('/:id', requireAuth, requireRole('admin'), controller.updateCategory);
categoriesRouter.delete('/:id', requireAuth, requireRole('admin'), controller.deleteCategory);
