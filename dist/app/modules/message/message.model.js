"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
// Attachment Schema
const AttachmentSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['image', 'audio', 'video', 'file'],
        required: true,
    },
    url: { type: String, required: true },
    name: { type: String },
    size: { type: Number },
    mime: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number }, // For audio/video
}, { _id: false });
// Session Proposal Schema (in-chat booking)
const SessionProposalSchema = new mongoose_1.Schema({
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    duration: {
        type: Number,
        required: true, // in minutes
    },
    price: {
        type: Number,
        required: true, // in EUR
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        default: 'PROPOSED',
    },
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, { _id: false });
// Message Schema
const messageSchema = new mongoose_1.Schema({
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Chat',
        index: true,
    },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true,
    },
    text: {
        type: String,
        required: false,
        maxlength: 1000,
        trim: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'media', 'doc', 'mixed', 'session_proposal'],
        default: 'text',
    },
    // Unified attachment system
    attachments: {
        type: [AttachmentSchema],
        default: [],
    },
    // In-chat booking (tutoring marketplace)
    sessionProposal: {
        type: SessionProposalSchema,
        required: false,
    },
    // Delivery & read tracking
    deliveredTo: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: [] }],
    readBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: [] }],
    // Message status
    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent',
    },
    // Edit tracking
    editedAt: { type: Date },
}, {
    timestamps: true,
});
// Indexes
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'sessionProposal.status': 1 }); // For filtering proposals
// Pre-save: Set proposal expiration (24 hours)
messageSchema.pre('save', function (next) {
    if (this.type === 'session_proposal' &&
        this.sessionProposal &&
        this.isNew &&
        !this.sessionProposal.expiresAt) {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24); // 24 hours from now
        this.sessionProposal.expiresAt = expirationDate;
    }
    next();
});
exports.Message = (0, mongoose_1.model)('Message', messageSchema);
