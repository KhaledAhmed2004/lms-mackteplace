import { z } from 'zod';

// Create trial request validation (Student)
const createTrialRequestZodSchema = z.object({
  body: z.object({
    subject: z
      .string({
        required_error: 'Subject is required',
      })
      .trim()
      .min(2, 'Subject must be at least 2 characters'),

    description: z
      .string({
        required_error: 'Description is required',
      })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description cannot exceed 500 characters'),

    preferredLanguage: z.enum(['ENGLISH', 'GERMAN'], {
      required_error: 'Preferred language is required',
    }),

    preferredDateTime: z
      .string()
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid preferred date/time format',
      })
      .optional(),
  }),
});

// Cancel trial request validation (Student)
const cancelTrialRequestZodSchema = z.object({
  body: z.object({
    cancellationReason: z
      .string({
        required_error: 'Cancellation reason is required',
      })
      .trim()
      .min(10, 'Cancellation reason must be at least 10 characters'),
  }),
});

export const TrialRequestValidation = {
  createTrialRequestZodSchema,
  cancelTrialRequestZodSchema,
};