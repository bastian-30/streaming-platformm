import 'dotenv/config';

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
};

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required('DATABASE_URL'),
  // En producción el secreto debe venir siempre de .env; en desarrollo se usa uno local
  jwtSecret: required('JWT_SECRET', isProduction ? undefined : 'dev-secret-cambiar-en-produccion'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 50),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  // URL base del servidor de streaming (Ant Media Server); se usa para construir
  // las URLs de reproducción y queda preparada para la integración en vivo
  antMediaBaseUrl: process.env.ANTMEDIA_BASE_URL ?? 'http://localhost:5080/LiveApp',
  // Credenciales para crear el administrador inicial si no existe ninguno
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? ''
};

if (isProduction && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}
