"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequestValidation = void 0;
const zod_1 = require("zod");
const trialRequest_interface_1 = require("./trialRequest.interface");
// Guardian info schema (required for students under 18)
const guardianInfoSchema = zod_1.z.object({
    name: zod_1.z
        .string({
        required_error: 'Guardian name is required',
    })
        .trim()
        .min(2, 'Guardian name must be at least 2 characters')
        .max(100, 'Guardian name cannot exceed 100 characters'),
    email: zod_1.z
        .string({
        required_error: 'Guardian email is required',
    })
        .trim()
        .email('Invalid guardian email format'),
    phone: zod_1.z
        .string({
        required_error: 'Guardian phone number is required',
    })
        .trim()
        .min(8, 'Phone number must be at least 8 characters')
        .max(20, 'Phone number cannot exceed 20 characters'),
    relationship: zod_1.z
        .enum(['PARENT', 'LEGAL_GUARDIAN', 'OTHER'], {
        invalid_type_error: 'Invalid relationship type',
    })
        .optional()
        .default('PARENT'),
});
// Student info schema
const studentInfoSchema = zod_1.z.object({
    firstName: zod_1.z
        .string({
        required_error: 'First name is required',
    })
        .trim()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name cannot exceed 50 characters'),
    lastName: zod_1.z
        .string({
        required_error: 'Last name is required',
    })
        .trim()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name cannot exceed 50 characters'),
    email: zod_1.z
        .string({
        required_error: 'Email is required',
    })
        .trim()
        .email('Invalid email format'),
    dateOfBirth: zod_1.z
        .string()
        .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date of birth format',
    })
        .optional(),
    isUnder18: zod_1.z.boolean({
        required_error: 'Please specify if student is under 18',
    }),
});
// Create trial request validation (Student/Guest)
const createTrialRequestZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        // Student Information (Required)
        studentInfo: studentInfoSchema,
        // Academic Information (Required)
        subject: zod_1.z
            .string({
            required_error: 'Subject ID is required',
        })
            .trim()
            .min(1, 'Subject ID is required'),
        gradeLevel: zod_1.z.nativeEnum(trialRequest_interface_1.GRADE_LEVEL, {
            required_error: 'Grade level is required',
            invalid_type_error: 'Invalid grade level',
        }),
        schoolType: zod_1.z.nativeEnum(trialRequest_interface_1.SCHOOL_TYPE, {
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
        preferredLanguage: zod_1.z.enum(['ENGLISH', 'GERMAN'], {
            required_error: 'Preferred language is required',
        }),
        preferredDateTime: zod_1.z
            .string()
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid preferred date/time format',
        })
            .optional(),
        // Documents (Optional)
        documents: zod_1.z.array(zod_1.z.string().url('Invalid document URL')).optional(),
        // Guardian Information (Conditionally required)
        guardianInfo: guardianInfoSchema.optional(),
    })
        .refine(data => {
        // If student is under 18, guardian info is required
        if (data.studentInfo.isUnder18 && !data.guardianInfo) {
            return false;
        }
        return true;
    }, {
        message: 'Guardian information is required for students under 18',
        path: ['guardianInfo'],
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
    guardianInfoSchema,
    studentInfoSchema,
};
