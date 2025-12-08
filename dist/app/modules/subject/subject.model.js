"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subject = void 0;
const mongoose_1 = require("mongoose");
const subjectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true,
    },
    slug: {
        type: String,
        required: [true, 'Subject slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    icon: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
// Index for faster queries
subjectSchema.index({ slug: 1 });
subjectSchema.index({ isActive: 1 });
exports.Subject = (0, mongoose_1.model)('Subject', subjectSchema);
