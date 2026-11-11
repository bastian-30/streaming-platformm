import type { Request } from 'express';
import { activityModel, type NewActivityLog } from '../models/activity.model.js';

/**
 * Registro de actividades (auditoría).
 * Nunca interrumpe la operación principal: si falla el registro, se deja
 * constancia en el log del servidor pero la petición continúa.
 */
export const activityLog = {
  async record(log: NewActivityLog): Promise<void> {
    try {
      await activityModel.create(log);
    } catch (error) {
      console.error('No se pudo registrar la actividad:', error);
    }
  },

  /** Registra una acción vinculada a la petición actual (usuario + IP). */
  async recordRequest(req: Request, log: Omit<NewActivityLog, 'userId' | 'userEmail' | 'ip'>): Promise<void> {
    const user = (req as { user?: { sub: string; email: string } }).user;
    await this.record({
      ...log,
      userId: user?.sub ?? null,
      userEmail: user?.email ?? null,
      ip: req.ip ?? null
    });
  },

  async list(limit: number, page: number) {
    const offset = (page - 1) * limit;
    const [entries, byAction] = await Promise.all([
      activityModel.list(limit, offset),
      activityModel.countByAction()
    ]);
    return { entries, by_action: byAction };
  }
};
