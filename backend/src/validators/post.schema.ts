import { z } from 'zod';

export const visibilityField = z.enum(['public', 'private']);
export const categoryIdField = z.coerce.number().int().positive().optional().nullable();

export const createPostSchema = z.object({
  title: z.string({ error: 'El título es obligatorio' }).trim().min(1, 'El título es obligatorio').max(200),
  body: z.string({ error: 'El contenido es obligatorio' }).trim().min(1, 'El contenido es obligatorio').max(20000),
  visibility: visibilityField.default('public'),
  category_id: categoryIdField
});

export const updatePostSchema = createPostSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debes enviar al menos un campo para actualizar' }
);

export const postListQuery = z.object({
  visibility: visibilityField.optional(),
  category_id: categoryIdField,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1)
});
