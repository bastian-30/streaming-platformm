import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  slug: z
    .string({ error: 'El slug es obligatorio' })
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener minúsculas, números y guiones')
    .max(80),
  description: z.string().trim().max(500).optional()
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debes enviar al menos un campo para actualizar' }
);
