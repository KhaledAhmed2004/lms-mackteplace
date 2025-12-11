"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRequestValidation = void 0;
const zod_1 = require("zod");
const sessionRequest_interface_1 = require("./sessionRequest.interface");
// Create session request validation (Student only - must be logged in)
const createSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Academic Information (Required)
        subject: zod_1.z
            .string({
            required_error: 'Subject is required',
        })
            .trim()
            .min(1, 'Subject is required'),
        gradeLevel: zod_1.z.nativeEnum(sessionRequest_interface_1.GRADE_LEVEL, {
            required_error: 'Grade level is required',
            invalid_type_error: 'Invalid grade level',
        }),
        schoolType: zod_1.z.nativeEnum(sessionRequest_interface_1.SCHOOL_TYPE, {
            required_error: 'School type is required',
            invalid_type_error: 'Invalid school type',
        }),
        // Learning Details
        description: zod_1.z
            .string({
            required_error: 'Description is required',
        })
            .trim()
            .min(10, 'Description must be at least 10 characters')
            .max(500, 'Description cannot exceed 500 characters'),
        learningGoals: zod_1.z
            .string()
            .trim()
            .max(1000, 'Learning goals cannot exceed 1000 characters')
            .optional(),
        preferredDateTime: zod_1.z
            .string()
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid preferred date/time format',
        })
            .optional(),
        // Documents (Optional)
        documents: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
// Cancel session request validation (Student)
const cancelSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        cancellationReason: zod_1.z
            .string({
            required_error: 'Cancellation reason is required',
        })
            .trim()
            .min(10, 'Cancellation reason must be at least 10 characters'),
    }),
});
exports.SessionRequestValidation = {
    createSessionRequestZodSchema,
    cancelSessionRequestZodSchema,
};
