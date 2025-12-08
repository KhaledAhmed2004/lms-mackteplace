"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequest = void 0;
const mongoose_1 = require("mongoose");
const trialRequest_interface_1 = require("./trialRequest.interface");
const trialRequestSchema = new mongoose_1.Schema({
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required'],
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    preferredLanguage: {
        type: String,
        enum: ['ENGLISH', 'GERMAN'],
        required: [true, 'Preferred language is required'],
    },
    preferredDateTime: {
        type: Date,
    },
    status: {
        type: String,
        enum: Object.values(trialRequest_interface_1.TRIAL_REQUEST_STATUS),
        default: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
    },
    acceptedTutorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
    },
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
    cancellationReason: {
        type: String,
        trim: true,
    },
}, { timestamps: true });
// Indexes for performance
trialRequestSchema.index({ studentId: 1 });
trialRequestSchema.index({ subject: 1 });
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
exports.TrialRequest = (0, mongoose_1.model)('TrialRequest', trialRequestSchema);
