import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

export const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' } }
});

export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Demasiados intentos de autenticación. Espera antes de volver a intentarlo.' } }
});
