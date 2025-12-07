import { z } from 'zod';

// Subscribe to plan validation (Student)
const subscribeToPlanZodSchema = z.object({
  body: z.object({
    tier: z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM'], {
      required_error: 'Subscription tier is required',
    }),
  }),
});

// Cancel subscription validation (Student)
const cancelSubscriptionZodSchema = z.object({
  body: z.object({
    cancellationReason: z
      .string({
        required_error: 'Cancellation reason is required',
      })
      .trim()
      .min(10, 'Cancellation reason must be at least 10 characters'),
  }),
});

export const StudentSubscriptionValidation = {
  subscribeToPlanZodSchema,
  cancelSubscriptionZodSchema,
};
