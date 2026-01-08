"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const mongoose_1 = require("mongoose");
const session_interface_1 = require("./session.interface");
// Attendance tracking sub-schema
const attendanceSchema = new mongoose_1.Schema({
    odId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    firstJoinedAt: {
        type: Date,
    },
    lastLeftAt: {
        type: Date,
    },
    totalDurationSeconds: {
        type: Number,
        default: 0,
    },
    attendancePercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    joinCount: {
        type: Number,
        default: 0,
    },
}, { _id: false });
// Reschedule request sub-schema
const rescheduleRequestSchema = new mongoose_1.Schema({
    requestedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    requestedAt: {
        type: Date,
        required: true,
    },
    newStartTime: {
        type: Date,
        required: true,
    },
    newEndTime: {
        type: Date,
        required: true,
    },
    reason: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: Object.values(session_interface_1.RESCHEDULE_STATUS),
        default: session_interface_1.RESCHEDULE_STATUS.PENDING,
    },
    respondedAt: {
        type: Date,
    },
    respondedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { _id: false });
const sessionSchema = new mongoose_1.Schema({
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
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required'],
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required'],
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        default: 60, // Fixed 60 minutes
    },
    bufferMinutes: {
        type: Number,
        default: 10, // 10 minutes extra buffer
    },
    pricePerHour: {
        type: Number,
        required: [true, 'Price per hour is required'], // EUR
    },
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'], // EUR
    },
    bufferPrice: {
        type: Number,
        default: 0, // Price for buffer time
    },
    googleMeetLink: {
        type: String,
    },
    googleCalendarEventId: {
        type: String,
    },
    status: {
        type: String,
        enum: Object.values(session_interface_1.SESSION_STATUS),
        default: session_interface_1.SESSION_STATUS.SCHEDULED,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(session_interface_1.PAYMENT_STATUS),
        default: session_interface_1.PAYMENT_STATUS.PENDING,
    },
    messageId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Message',
    },
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
    },
    reviewId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SessionReview',
    },
    tutorFeedbackId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TutorSessionFeedback',
    },
    trialRequestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrialRequest',
    },
    isTrial: {
        type: Boolean,
        default: false,
    },
    // Reschedule fields
    rescheduleRequest: rescheduleRequestSchema,
    previousStartTime: {
        type: Date,
    },
    previousEndTime: {
        type: Date,
    },
    // Cancellation fields
    cancellationReason: {
        type: String,
        trim: true,
    },
    cancelledBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Timestamp fields
    startedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    expiredAt: {
        type: Date,
    },
    // Attendance tracking fields
    callId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Call',
    },
    tutorAttendance: attendanceSchema,
    studentAttendance: attendanceSchema,
    noShowBy: {
        type: String,
        enum: ['tutor', 'student'],
    },
}, { timestamps: true });
// Indexes for performance
sessionSchema.index({ studentId: 1, createdAt: -1 });
sessionSchema.index({ tutorId: 1, createdAt: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ startTime: 1, endTime: 1 });
sessionSchema.index({ chatId: 1 });
sessionSchema.index({ trialRequestId: 1 });
// Compound index for upcoming sessions
sessionSchema.index({ status: 1, startTime: 1 });
// Index for status transitions (cron jobs)
sessionSchema.index({ status: 1, endTime: 1 });
// Index for call-based lookups
sessionSchema.index({ callId: 1 });
// Validate endTime is after startTime
sessionSchema.pre('save', function (next) {
    if (this.endTime <= this.startTime) {
        next(new Error('End time must be after start time'));
    }
    next();
});
// Calculate total price if not provided
sessionSchema.pre('save', function (next) {
    if (!this.totalPrice && this.pricePerHour && this.duration) {
        this.totalPrice = (this.pricePerHour * this.duration) / 60;
    }
    // Calculate buffer price
    if (!this.bufferPrice && this.pricePerHour && this.bufferMinutes) {
        this.bufferPrice = (this.pricePerHour * this.bufferMinutes) / 60;
    }
    next();
});
exports.Session = (0, mongoose_1.model)('Session', sessionSchema);
