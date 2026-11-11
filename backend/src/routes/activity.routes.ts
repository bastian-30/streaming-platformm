import { Router } from 'express';
import * as controller from '../controllers/activity.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const activityRouter = Router();

activityRouter.get('/', requireAuth, requireRole('admin'), controller.listActivityLogs);
