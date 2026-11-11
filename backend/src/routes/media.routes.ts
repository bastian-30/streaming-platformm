import { Router } from 'express';
import * as controller from '../controllers/media.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

export const mediaRouter = Router();

mediaRouter.get('/', optionalAuth, controller.listMedia);
mediaRouter.get('/:id', optionalAuth, controller.getMedia);
// La subida valida tipo y tamaño de archivo en el middleware de multer
mediaRouter.post('/', requireAuth, controller.uploadMediaFile, controller.uploadMedia);
mediaRouter.get('/:id/file', optionalAuth, controller.getMediaFile);
mediaRouter.put('/:id', requireAuth, controller.updateMedia);
mediaRouter.delete('/:id', requireAuth, controller.deleteMedia);
