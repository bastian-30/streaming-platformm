import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { pool } from '../database/client.js';

export const health = asyncHandler(async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      application: 'Streaming Platform API',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'error',
      application: 'Streaming Platform API',
      database: 'disconnected'
    });
  }
});
