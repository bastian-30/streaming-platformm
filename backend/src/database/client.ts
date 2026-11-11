import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10
});

pool.on('error', (error) => {
  console.error('Error inesperado en PostgreSQL:', error);
});

export const query = pool.query.bind(pool);
