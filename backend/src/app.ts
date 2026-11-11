import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes/index.js';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Cabeceras de seguridad (permite servir archivos a la PWA en otro origen)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Protección CORS con orígenes permitidos desde .env
  app.use(cors(corsOptions));

  // Límite global de solicitudes
  app.use(generalLimiter);

  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
