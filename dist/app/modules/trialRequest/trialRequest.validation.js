"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequestValidation = void 0;
const zod_1 = require("zod");
// Create trial request validation (Student)
const createTrialRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        subject: zod_1.z
            .string({
            required_error: 'Subject is required',
        })
            .trim()
            .min(2, 'Subject must be at least 2 characters'),
        description: zod_1.z
            .string({
            required_error: 'Description is required',
        })
            .trim()
            .min(10, 'Description must be at least 10 characters')
            .max(500, 'Description cannot exceed 500 characters'),
        preferredLanguage: zod_1.z.enum(['ENGLISH', 'GERMAN'], {
            required_error: 'Preferred language is required',
        }),
        preferredDateTime: zod_1.z
            .string()
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid preferred date/time format',
        })
            .optional(),
    }),
});
// Cancel trial request validation (Student)
const cancelTrialRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        cancellationReason: zod_1.z
            .string({
            required_error: 'Cancellation reason is required',
        })
            .trim()
            .min(10, 'Cancellation reason must be at least 10 characters'),
    }),
});
exports.TrialRequestValidation = {
    createTrialRequestZodSchema,
    cancelTrialRequestZodSchema,
};
