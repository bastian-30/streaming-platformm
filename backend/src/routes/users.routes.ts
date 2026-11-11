import { Router } from 'express';
import * as controller from '../controllers/user.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', requireRole('admin'), controller.listUsers);
usersRouter.get('/:id', controller.getUserById);
usersRouter.put('/:id', controller.updateUser);
usersRouter.delete('/:id', requireRole('admin'), controller.deleteUser);
