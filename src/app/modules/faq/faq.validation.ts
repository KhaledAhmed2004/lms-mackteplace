import { z } from 'zod';

const createFAQZodSchema = z.object({
  body: z.object({
    question: z
      .string({ required_error: 'Question is required' })
      .trim()
      .min(5, 'Question must be at least 5 characters')
      .max(200, 'Question must not exceed 200 characters'),
    answer: z
      .string({ required_error: 'Answer is required' })
      .trim()
      .min(10, 'Answer must be at least 10 characters')
      .max(2000, 'Answer must not exceed 2000 characters'),
    isActive: z.boolean().optional().default(true),
  }),
});

const updateFAQZodSchema = z.object({
  body: z.object({
    question: z
      .string()
      .trim()
      .min(5, 'Question must be at least 5 characters')
      .max(200, 'Question must not exceed 200 characters')
      .optional(),
    answer: z
      .string()
      .trim()
      .min(10, 'Answer must be at least 10 characters')
      .max(2000, 'Answer must not exceed 2000 characters')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const FAQValidation = {
  createFAQZodSchema,
  updateFAQZodSchema,
};
