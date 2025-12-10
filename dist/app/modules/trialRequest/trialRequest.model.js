"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequest = void 0;
const mongoose_1 = require("mongoose");
const trialRequest_interface_1 = require("./trialRequest.interface");
// Guardian info sub-schema
const guardianInfoSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Guardian name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Guardian email is required'],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: [true, 'Guardian phone number is required'],
        trim: true,
    },
    relationship: {
        type: String,
        enum: ['PARENT', 'LEGAL_GUARDIAN', 'OTHER'],
        default: 'PARENT',
    },
}, { _id: false });
// Student info sub-schema
const studentInfoSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
    },
    dateOfBirth: {
        type: Date,
    },
    isUnder18: {
        type: Boolean,
        required: [true, 'Age verification is required'],
        default: false,
    },
}, { _id: false });
const trialRequestSchema = new mongoose_1.Schema({
    // Student reference (optional - for registered users)
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Student Information (Required)
    studentInfo: {
        type: studentInfoSchema,
        required: [true, 'Student information is required'],
    },
    // Academic Information (Required)
    subject: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'Subject is required'],
    },
    gradeLevel: {
        type: String,
        enum: Object.values(trialRequest_interface_1.GRADE_LEVEL),
        required: [true, 'Grade level is required'],
    },
    schoolType: {
        type: String,
        enum: Object.values(trialRequest_interface_1.SCHOOL_TYPE),
        required: [true, 'School type is required'],
    },
    // Learning Details
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    learningGoals: {
        type: String,
        trim: true,
        maxlength: [1000, 'Learning goals cannot exceed 1000 characters'],
    },
    preferredLanguage: {
        type: String,
        enum: ['ENGLISH', 'GERMAN'],
        required: [true, 'Preferred language is required'],
    },
    preferredDateTime: {
        type: Date,
    },
    // Documents (Optional)
    documents: [
        {
            type: String,
            trim: true,
        },
    ],
    // Guardian Information (Required if student is under 18)
    guardianInfo: {
        type: guardianInfoSchema,
    },
    // Request Status
    status: {
        type: String,
        enum: Object.values(trialRequest_interface_1.TRIAL_REQUEST_STATUS),
        default: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
    },
    // Matching details
    acceptedTutorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
    },
    // Timestamps
    expiresAt: {
        type: Date,
        required: [true, 'Expiration date is required'],
    },
    acceptedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    // Metadata
    cancellationReason: {
        type: String,
        trim: true,
    },
}, { timestamps: true });
// Indexes for performance
trialRequestSchema.index({ studentId: 1 });
trialRequestSchema.index({ 'studentInfo.email': 1 });
trialRequestSchema.index({ subject: 1 });
trialRequestSchema.index({ gradeLevel: 1 });
trialRequestSchema.index({ schoolType: 1 });
trialRequestSchema.index({ status: 1 });
trialRequestSchema.index({ expiresAt: 1 });
trialRequestSchema.index({ acceptedTutorId: 1 });
trialRequestSchema.index({ createdAt: -1 }); // Latest first
// Compound index for tutor matching queries
trialRequestSchema.index({ status: 1, subject: 1, expiresAt: 1 });
// Pre-save: Set expiration date (24 hours from creation)
trialRequestSchema.pre('save', function (next) {
    if (this.isNew && !this.expiresAt) {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24); // 24 hours from now
        this.expiresAt = expirationDate;
    }
    next();
});
// Pre-save: Validate guardian info for under 18
trialRequestSchema.pre('save', function (next) {
    var _a;
    if (((_a = this.studentInfo) === null || _a === void 0 ? void 0 : _a.isUnder18) && !this.guardianInfo) {
        const error = new Error('Guardian information is required for students under 18');
        return next(error);
    }
    next();
});
exports.TrialRequest = (0, mongoose_1.model)('TrialRequest', trialRequestSchema);
