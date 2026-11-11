import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { activityLog } from '../services/activity.service.js';

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1)
});

export const listActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuery.parse(req.query);
  const logs = await activityLog.list(query.limit, query.page);
  res.json(logs);
});
