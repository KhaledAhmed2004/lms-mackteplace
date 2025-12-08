"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectValidation = void 0;
const zod_1 = require("zod");
const createSubjectZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({
            required_error: 'Subject name is required',
        }).trim().min(2, 'Subject name must be at least 2 characters'),
        slug: zod_1.z.string({
            required_error: 'Subject slug is required',
        }).trim().toLowerCase().min(2, 'Slug must be at least 2 characters'),
        icon: zod_1.z.string().url('Icon must be a valid URL').optional(),
        description: zod_1.z.string().trim().optional(),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
});
const updateSubjectZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, 'Subject name must be at least 2 characters').optional(),
        slug: zod_1.z.string().trim().toLowerCase().min(2, 'Slug must be at least 2 characters').optional(),
        icon: zod_1.z.string().url('Icon must be a valid URL').optional(),
        description: zod_1.z.string().trim().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.SubjectValidation = {
    createSubjectZodSchema,
    updateSubjectZodSchema,
};
