import { z } from 'zod';
import { categoryIdField, visibilityField } from './post.schema.js';

export const streamStatusField = z.enum(['scheduled', 'live', 'ended']);

export const createStreamSchema = z.object({
  title: z.string({ error: 'El título es obligatorio' }).trim().min(1).max(200),
  stream_id: z.string().trim().min(3).max(200).optional(),
  visibility: visibilityField.default('public'),
  category_id: categoryIdField
});

export const updateStreamSchema = createStreamSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debes enviar al menos un campo para actualizar' }
);

export const streamStatusSchema = z.object({
  status: streamStatusField
});

export const streamListQuery = z.object({
  status: streamStatusField.optional(),
  visibility: visibilityField.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1)
});
