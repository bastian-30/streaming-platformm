import { Router } from 'express';
import * as controller from '../controllers/stats.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const statsRouter = Router();

statsRouter.get('/', requireAuth, requireRole('admin'), controller.getStats);
