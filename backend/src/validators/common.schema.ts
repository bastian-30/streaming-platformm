import { z } from 'zod';

export const uuidParam = z.object({
  id: z.string().uuid('Identificador no válido')
});

export const intIdParam = z.object({
  id: z.coerce.number({ error: 'Identificador no válido' }).int().positive()
});

export const updateUserSchema = z
  .object({
    display_name: z.string().trim().min(2).max(80).optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100).optional(),
    email: z.string().trim().toLowerCase().email('Email no válido').max(255).optional(),
    role_id: z.coerce.number().int().positive().optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo para actualizar' });
