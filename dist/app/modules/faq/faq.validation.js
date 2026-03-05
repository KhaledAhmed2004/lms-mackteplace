"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQValidation = void 0;
const zod_1 = require("zod");
const createFAQZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        question: zod_1.z
            .string({ required_error: 'Question is required' })
            .trim()
            .min(5, 'Question must be at least 5 characters')
            .max(200, 'Question must not exceed 200 characters'),
        answer: zod_1.z
            .string({ required_error: 'Answer is required' })
            .trim()
            .min(10, 'Answer must be at least 10 characters')
            .max(2000, 'Answer must not exceed 2000 characters'),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
});
const updateFAQZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        question: zod_1.z
            .string()
            .trim()
            .min(5, 'Question must be at least 5 characters')
            .max(200, 'Question must not exceed 200 characters')
            .optional(),
        answer: zod_1.z
            .string()
            .trim()
            .min(10, 'Answer must be at least 10 characters')
            .max(2000, 'Answer must not exceed 2000 characters')
            .optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.FAQValidation = {
    createFAQZodSchema,
    updateFAQZodSchema,
};
