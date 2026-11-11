import { createApp } from './app.js';
import { env } from './config/env.js';
import { ensureInitialAdmin } from './database/bootstrap.js';

const app = createApp();

app.listen(env.port, async () => {
  console.log(`Streaming Platform API disponible en http://localhost:${env.port}`);
  console.log(`Entorno: ${env.nodeEnv}`);
  try {
    await ensureInitialAdmin();
  } catch (error) {
    console.error('No se pudo verificar el administrador inicial:', error);
  }
});
