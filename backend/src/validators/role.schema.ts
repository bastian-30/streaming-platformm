import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string({ error: 'El nombre del rol es obligatorio' })
    .trim()
    .toLowerCase()
    .min(2, 'El rol debe tener al menos 2 caracteres')
    .max(30)
    .regex(/^[a-z_]+$/, 'El rol solo puede contener letras minúsculas y guiones bajos')
});

export const updateRoleSchema = createRoleSchema;
