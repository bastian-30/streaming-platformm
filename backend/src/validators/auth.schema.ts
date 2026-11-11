import { z } from 'zod';

export const emailField = z
  .string({ error: 'El email es obligatorio' })
  .trim()
  .toLowerCase()
  .email('Email no válido')
  .max(255);

export const passwordField = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(100, 'La contraseña no puede superar 100 caracteres');

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  display_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80).optional()
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria').max(100)
});
