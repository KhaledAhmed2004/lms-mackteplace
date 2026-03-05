import { z } from 'zod';

export const AdminValidation = {
  overviewStatsQuerySchema: z.object({
    query: z.object({
      period: z
        .enum(['day', 'week', 'month', 'quarter', 'year'])
        .optional()
        .default('month'),
    }),
  }),

  monthlyRevenueQuerySchema: z.object({
    query: z.object({
      year: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : new Date().getFullYear())),
      months: z.string().optional(), // comma-separated e.g. "1,2,3"
      tutorId: z.string().optional(),
      studentId: z.string().optional(),
      subscriptionTier: z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']).optional(),
      subject: z.string().optional(),
    }),
  }),

  userDistributionQuerySchema: z.object({
    query: z.object({
      groupBy: z.enum(['role', 'status', 'both']).optional().default('role'),
    }),
  }),
};
