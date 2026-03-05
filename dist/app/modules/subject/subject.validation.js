"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectValidation = void 0;
const zod_1 = require("zod");
exports.SubjectValidation = {
    createSubjectZodSchema: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z
                .string({
                required_error: 'Subject name is required',
            })
                .trim()
                .min(2, 'Subject name must be at least 2 characters'),
            isActive: zod_1.z.boolean().optional().default(true),
        }),
    }),
    updateSubjectZodSchema: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z
                .string()
                .trim()
                .min(2, 'Subject name must be at least 2 characters')
                .optional(),
            isActive: zod_1.z.boolean().optional(),
        }),
    }),
};
