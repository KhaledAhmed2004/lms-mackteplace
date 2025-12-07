import { z } from 'zod';

// Create application validation (with file upload)
const createApplicationZodSchema = z.object({
  body: z.object({
    subjects: z
      .array(z.string().trim().min(1, 'Subject cannot be empty'))
      .min(1, 'At least one subject is required'),

    name: z.string({
      required_error: 'Name is required',
    }).trim().min(2, 'Name must be at least 2 characters'),

    email: z.string({
      required_error: 'Email is required',
    }).email('Invalid email format').toLowerCase(),

    phone: z.string({
      required_error: 'Phone number is required',
    }).trim().min(5, 'Phone number must be at least 5 characters'),

    address: z.string({
      required_error: 'Address is required',
    }).trim().min(5, 'Address must be at least 5 characters'),

    birthDate: z.string({
      required_error: 'Birth date is required',
    }).refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),

    // File URLs (uploaded via separate file upload endpoint)
    cvUrl: z.string({
      required_error: 'CV is required',
    }).url('CV must be a valid URL'),

    abiturCertificateUrl: z.string({
      required_error: 'Abitur certificate is required', // MANDATORY
    }).url('Abitur certificate must be a valid URL'),

    educationProofUrls: z
      .array(z.string().url('Education proof must be a valid URL'))
      .optional(),
  }),
});

// Update application status (admin only)
const updateApplicationStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([
      'SUBMITTED',
      'DOCUMENTS_REVIEWED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_DONE',
      'APPROVED',
      'REJECTED',
    ]).optional(),

    rejectionReason: z.string().trim().optional(),

    adminNotes: z.string().trim().optional(),
  }),
});

// Approve to Phase 2 (Interview)
const approveToPhase2ZodSchema = z.object({
  body: z.object({
    adminNotes: z.string().trim().optional(),
  }),
});

// Reject application
const rejectApplicationZodSchema = z.object({
  body: z.object({
    rejectionReason: z.string({
      required_error: 'Rejection reason is required',
    }).trim().min(10, 'Rejection reason must be at least 10 characters'),
  }),
});

export const TutorApplicationValidation = {
  createApplicationZodSchema,
  updateApplicationStatusZodSchema,
  approveToPhase2ZodSchema,
  rejectApplicationZodSchema,
};