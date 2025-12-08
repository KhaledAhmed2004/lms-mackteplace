"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorEarningsValidation = void 0;
const zod_1 = require("zod");
const generateTutorEarningsZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        month: zod_1.z
            .number({
            required_error: 'Month is required',
            invalid_type_error: 'Month must be a number',
        })
            .min(1, 'Month must be between 1-12')
            .max(12, 'Month must be between 1-12'),
        year: zod_1.z
            .number({
            required_error: 'Year is required',
            invalid_type_error: 'Year must be a number',
        })
            .min(2020, 'Year must be 2020 or later')
            .max(2100, 'Year must be before 2100'),
        commissionRate: zod_1.z
            .number()
            .min(0, 'Commission rate must be between 0-1')
            .max(1, 'Commission rate must be between 0-1')
            .optional()
            .default(0.2), // 20% default
    }),
});
const initiatePayoutZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        notes: zod_1.z.string().optional(),
    }),
});
const markAsFailedZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        failureReason: zod_1.z
            .string({
            required_error: 'Failure reason is required',
        })
            .min(1, 'Failure reason cannot be empty'),
    }),
});
exports.TutorEarningsValidation = {
    generateTutorEarningsZodSchema,
    initiatePayoutZodSchema,
    markAsFailedZodSchema,
};
