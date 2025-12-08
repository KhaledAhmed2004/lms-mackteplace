"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionReview = void 0;
const mongoose_1 = require("mongoose");
const sessionReviewSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'Session ID is required'],
        unique: true, // One review per session
    },
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required'],
    },
    tutorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Tutor ID is required'],
    },
    overallRating: {
        type: Number,
        required: [true, 'Overall rating is required'],
        min: [1, 'Rating must be between 1-5'],
        max: [5, 'Rating must be between 1-5'],
    },
    teachingQuality: {
        type: Number,
        required: [true, 'Teaching quality rating is required'],
        min: [1, 'Rating must be between 1-5'],
        max: [5, 'Rating must be between 1-5'],
    },
    communication: {
        type: Number,
        required: [true, 'Communication rating is required'],
        min: [1, 'Rating must be between 1-5'],
        max: [5, 'Rating must be between 1-5'],
    },
    punctuality: {
        type: Number,
        required: [true, 'Punctuality rating is required'],
        min: [1, 'Rating must be between 1-5'],
        max: [5, 'Rating must be between 1-5'],
    },
    preparedness: {
        type: Number,
        required: [true, 'Preparedness rating is required'],
        min: [1, 'Rating must be between 1-5'],
        max: [5, 'Rating must be between 1-5'],
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    wouldRecommend: {
        type: Boolean,
        required: [true, 'Would recommend field is required'],
        default: true,
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
    },
}, { timestamps: true });
// Indexes
sessionReviewSchema.index({ tutorId: 1, createdAt: -1 });
sessionReviewSchema.index({ studentId: 1, createdAt: -1 });
sessionReviewSchema.index({ sessionId: 1 }, { unique: true });
sessionReviewSchema.index({ overallRating: 1 });
// Compound index for public reviews
sessionReviewSchema.index({ tutorId: 1, isPublic: 1 });
exports.SessionReview = (0, mongoose_1.model)('SessionReview', sessionReviewSchema);
