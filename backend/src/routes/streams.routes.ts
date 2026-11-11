import { Router } from 'express';
import * as controller from '../controllers/stream.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

export const streamsRouter = Router();

streamsRouter.get('/', optionalAuth, controller.listStreams);
streamsRouter.get('/:id', optionalAuth, controller.getStream);
// Reproducción: solo usuarios autorizados (privada = creador o admin)
streamsRouter.get('/:id/playback', optionalAuth, controller.getStreamPlayback);
streamsRouter.post('/', requireAuth, controller.createStream);
streamsRouter.put('/:id', requireAuth, controller.updateStream);
streamsRouter.patch('/:id/status', requireAuth, controller.changeStreamStatus);
streamsRouter.delete('/:id', requireAuth, controller.deleteStream);
