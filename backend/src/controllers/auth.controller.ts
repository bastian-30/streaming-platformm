import type { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getUser } from '../middleware/auth.js';
import { authService } from '../services/auth.service.js';
import { activityLog } from '../services/activity.service.js';
import { loginSchema, registerSchema } from '../validators/auth.schema.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data.email, data.password, data.display_name);
  await activityLog.recordRequest(req, {
    action: 'auth.register',
    resource: 'auth',
    resourceId: result.user.id,
    details: { email: data.email }
  });
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  try {
    const result = await authService.login(data.email, data.password);
    await activityLog.recordRequest(req, {
      action: 'auth.login',
      resource: 'auth',
      resourceId: result.user.id,
      details: { email: data.email }
    });
    res.json(result);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await activityLog.recordRequest(req, {
        action: 'auth.login_failed',
        resource: 'auth',
        details: { email: data.email }
      });
    }
    throw error;
  }
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) {
    // La ruta está protegida por requireAuth; esto es una salvaguarda
    return res.status(401).json({ error: { message: 'No autenticado' } });
  }
  const profile = await authService.profile(user.sub);
  res.json(profile);
});
