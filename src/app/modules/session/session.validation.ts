import { z } from 'zod';

// Propose session validation (Tutor sends in chat)
const proposeSessionZodSchema = z.object({
  body: z.object({
    chatId: z
      .string({
        required_error: 'Chat ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid chat ID format'),

    subject: z
      .string({
        required_error: 'Subject is required',
      })
      .trim()
      .min(2, 'Subject must be at least 2 characters'),

    startTime: z
      .string({
        required_error: 'Start time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid start time format',
      })
      .refine(
        date => new Date(date) > new Date(),
        {
          message: 'Start time must be in the future',
        }
      ),

    endTime: z
      .string({
        required_error: 'End time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid end time format',
      }),

    description: z.string().trim().optional(),
  }).refine(
    data => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  ),
});

// Accept session proposal validation (Student accepts)
const acceptSessionProposalZodSchema = z.object({
  params: z.object({
    messageId: z
      .string({
        required_error: 'Message ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
  }),
});

// Reject session proposal validation (Student rejects)
const rejectSessionProposalZodSchema = z.object({
  params: z.object({
    messageId: z
      .string({
        required_error: 'Message ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
  }),
  body: z.object({
    rejectionReason: z
      .string({
        required_error: 'Rejection reason is required',
      })
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters'),
  }),
});

// Cancel session validation
const cancelSessionZodSchema = z.object({
  body: z.object({
    cancellationReason: z
      .string({
        required_error: 'Cancellation reason is required',
      })
      .trim()
      .min(10, 'Cancellation reason must be at least 10 characters'),
  }),
});

// Mark session as completed validation (Manual completion)
const completeSessionZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Session ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID format'),
  }),
});

export const SessionValidation = {
  proposeSessionZodSchema,
  acceptSessionProposalZodSchema,
  rejectSessionProposalZodSchema,
  cancelSessionZodSchema,
  completeSessionZodSchema,
};