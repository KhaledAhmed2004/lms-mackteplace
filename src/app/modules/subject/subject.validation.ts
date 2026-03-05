import { z } from 'zod';

export const SubjectValidation = {
  createSubjectZodSchema: z.object({
    body: z.object({
      name: z
        .string({
          required_error: 'Subject name is required',
        })
        .trim()
        .min(2, 'Subject name must be at least 2 characters'),
      isActive: z.boolean().optional().default(true),
    }),
  }),

  updateSubjectZodSchema: z.object({
    body: z.object({
      name: z
        .string()
        .trim()
        .min(2, 'Subject name must be at least 2 characters')
        .optional(),
      isActive: z.boolean().optional(),
    }),
  }),
};
