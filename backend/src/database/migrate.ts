import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './client.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDir, '../../sql/init.sql');

async function main(): Promise<void> {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Esquema aplicado correctamente (roles, usuarios, publicaciones, multimedia, categorías, transmisiones).');
  await pool.end();
}

main().catch((error) => {
  console.error('No se pudo aplicar el esquema:', error);
  process.exit(1);
});
