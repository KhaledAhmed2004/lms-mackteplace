import { z } from 'zod';

const generateTutorEarningsZodSchema = z.object({
  body: z.object({
    month: z
      .number({
        required_error: 'Month is required',
        invalid_type_error: 'Month must be a number',
      })
      .min(1, 'Month must be between 1-12')
      .max(12, 'Month must be between 1-12'),
    year: z
      .number({
        required_error: 'Year is required',
        invalid_type_error: 'Year must be a number',
      })
      .min(2020, 'Year must be 2020 or later')
      .max(2100, 'Year must be before 2100'),
    commissionRate: z
      .number()
      .min(0, 'Commission rate must be between 0-1')
      .max(1, 'Commission rate must be between 0-1')
      .optional()
      .default(0.2), // 20% default
  }),
});

const initiatePayoutZodSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
  }),
});

const markAsFailedZodSchema = z.object({
  body: z.object({
    failureReason: z
      .string({
        required_error: 'Failure reason is required',
      })
      .min(1, 'Failure reason cannot be empty'),
  }),
});

export const TutorEarningsValidation = {
  generateTutorEarningsZodSchema,
  initiatePayoutZodSchema,
  markAsFailedZodSchema,
};
