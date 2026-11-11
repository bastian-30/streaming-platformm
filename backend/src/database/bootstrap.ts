import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from './client.js';
import { roleModel } from '../models/role.model.js';

/**
 * Crea el administrador inicial si la plataforma no tiene ninguno.
 * Se usa en el primer arranque (por ejemplo, al levantar el stack de Docker)
 * con las credenciales definidas en ADMIN_EMAIL y ADMIN_PASSWORD.
 */
export async function ensureInitialAdmin(): Promise<void> {
  const admins = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin'`
  );
  if (admins.rows[0].total > 0) return;

  if (!env.adminEmail || !env.adminPassword) {
    console.log(
      'No hay administradores. Define ADMIN_EMAIL y ADMIN_PASSWORD en .env para crear uno en el arranque.'
    );
    return;
  }

  const adminRole = await roleModel.findByName('admin');
  if (!adminRole) {
    console.error('No se pudo crear el admin inicial: falta el rol admin en la base de datos.');
    return;
  }

  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [env.adminEmail]);
  if (existing.rows.length > 0) {
    // El usuario ya existe pero no es admin (por ejemplo, se registró antes): se promueve
    await pool.query(`UPDATE users SET role_id = $1 WHERE email = $2`, [adminRole.id, env.adminEmail]);
    console.log(`Usuario existente ${env.adminEmail} promovido a administrador.`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, env.bcryptRounds);
  await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role_id)
     VALUES ($1, $2, 'Administrador', $3)`,
    [env.adminEmail, passwordHash, adminRole.id]
  );
  console.log(`Administrador inicial creado: ${env.adminEmail}`);
}
