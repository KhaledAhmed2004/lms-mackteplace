import { z } from 'zod';

// Create session request validation (Student only - must be logged in)
const createSessionRequestZodSchema = z.object({
  body: z.object({
    // Academic Information (Required)
    subject: z
      .string({
        required_error: 'Subject is required',
      })
      .trim()
      .min(1, 'Subject is required'),

    gradeLevel: z
      .string({
        required_error: 'Grade level is required',
      })
      .trim()
      .min(1, 'Grade level is required'),

    schoolType: z
      .string({
        required_error: 'School type is required',
      })
      .trim()
      .min(1, 'School type is required'),

    // Learning Details
    description: z
      .string({
        required_error: 'Description is required',
      })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description cannot exceed 500 characters'),

    learningGoals: z
      .string()
      .trim()
      .max(1000, 'Learning goals cannot exceed 1000 characters')
      .optional(),

    preferredDateTime: z
      .string()
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid preferred date/time format',
      })
      .optional(),

    // Documents (Optional)
    documents: z.array(z.string()).optional(),
  }),
});

// Cancel session request validation (Student)
const cancelSessionRequestZodSchema = z.object({
  body: z.object({
    cancellationReason: z
      .string({
        required_error: 'Cancellation reason is required',
      })
      .trim()
      .min(10, 'Cancellation reason must be at least 10 characters'),
  }),
});

// Accept session request validation (Tutor)
const acceptSessionRequestZodSchema = z.object({
  body: z.object({
    introductoryMessage: z
      .string()
      .trim()
      .transform(val => val === '' ? undefined : val)
      .optional()
      .refine(
        val => val === undefined || (val.length >= 10 && val.length <= 500),
        {
          message: 'Introductory message must be between 10 and 500 characters',
        }
      ),
  }),
});

export const SessionRequestValidation = {
  createSessionRequestZodSchema,
  cancelSessionRequestZodSchema,
  acceptSessionRequestZodSchema,
};
