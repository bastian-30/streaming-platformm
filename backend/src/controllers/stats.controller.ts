import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { statsService } from '../services/stats.service.js';

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await statsService.overview();
  res.json(stats);
});
