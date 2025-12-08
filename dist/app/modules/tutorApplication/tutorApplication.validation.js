"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorApplicationValidation = void 0;
const zod_1 = require("zod");
// Create application validation (with file upload)
const createApplicationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjects: zod_1.z
            .array(zod_1.z.string().trim().min(1, 'Subject cannot be empty'))
            .min(1, 'At least one subject is required'),
        name: zod_1.z.string({
            required_error: 'Name is required',
        }).trim().min(2, 'Name must be at least 2 characters'),
        email: zod_1.z.string({
            required_error: 'Email is required',
        }).email('Invalid email format').toLowerCase(),
        phone: zod_1.z.string({
            required_error: 'Phone number is required',
        }).trim().min(5, 'Phone number must be at least 5 characters'),
        address: zod_1.z.string({
            required_error: 'Address is required',
        }).trim().min(5, 'Address must be at least 5 characters'),
        birthDate: zod_1.z.string({
            required_error: 'Birth date is required',
        }).refine((date) => !isNaN(Date.parse(date)), {
            message: 'Invalid date format',
        }),
        // File URLs (uploaded via separate file upload endpoint)
        cvUrl: zod_1.z.string({
            required_error: 'CV is required',
        }).url('CV must be a valid URL'),
        abiturCertificateUrl: zod_1.z.string({
            required_error: 'Abitur certificate is required', // MANDATORY
        }).url('Abitur certificate must be a valid URL'),
        educationProofUrls: zod_1.z
            .array(zod_1.z.string().url('Education proof must be a valid URL'))
            .optional(),
    }),
});
// Update application status (admin only)
const updateApplicationStatusZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum([
            'SUBMITTED',
            'DOCUMENTS_REVIEWED',
            'INTERVIEW_SCHEDULED',
            'INTERVIEW_DONE',
            'APPROVED',
            'REJECTED',
        ]).optional(),
        rejectionReason: zod_1.z.string().trim().optional(),
        adminNotes: zod_1.z.string().trim().optional(),
    }),
});
// Approve to Phase 2 (Interview)
const approveToPhase2ZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        adminNotes: zod_1.z.string().trim().optional(),
    }),
});
// Reject application
const rejectApplicationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        rejectionReason: zod_1.z.string({
            required_error: 'Rejection reason is required',
        }).trim().min(10, 'Rejection reason must be at least 10 characters'),
    }),
});
exports.TutorApplicationValidation = {
    createApplicationZodSchema,
    updateApplicationStatusZodSchema,
    approveToPhase2ZodSchema,
    rejectApplicationZodSchema,
};
