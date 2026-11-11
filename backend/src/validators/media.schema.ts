import { z } from 'zod';
import { categoryIdField, visibilityField } from './post.schema.js';

export const updateMediaSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    visibility: visibilityField.optional(),
    category_id: categoryIdField
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo para actualizar' });

export const mediaListQuery = z.object({
  media_type: z.enum(['video', 'audio', 'image']).optional(),
  visibility: visibilityField.optional(),
  category_id: categoryIdField,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1)
});
