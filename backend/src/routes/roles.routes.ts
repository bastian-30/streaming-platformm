import { Router } from 'express';
import * as controller from '../controllers/role.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get('/', controller.listRoles);
rolesRouter.post('/', requireRole('admin'), controller.createRole);
rolesRouter.put('/:id', requireRole('admin'), controller.updateRole);
rolesRouter.delete('/:id', requireRole('admin'), controller.deleteRole);
