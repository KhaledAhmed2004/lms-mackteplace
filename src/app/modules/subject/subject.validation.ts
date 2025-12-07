import { z } from 'zod';

const createSubjectZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Subject name is required',
    }).trim().min(2, 'Subject name must be at least 2 characters'),

    slug: z.string({
      required_error: 'Subject slug is required',
    }).trim().toLowerCase().min(2, 'Slug must be at least 2 characters'),

    icon: z.string().url('Icon must be a valid URL').optional(),

    description: z.string().trim().optional(),

    isActive: z.boolean().optional().default(true),
  }),
});

const updateSubjectZodSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Subject name must be at least 2 characters').optional(),
    slug: z.string().trim().toLowerCase().min(2, 'Slug must be at least 2 characters').optional(),
    icon: z.string().url('Icon must be a valid URL').optional(),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const SubjectValidation = {
  createSubjectZodSchema,
  updateSubjectZodSchema,
};