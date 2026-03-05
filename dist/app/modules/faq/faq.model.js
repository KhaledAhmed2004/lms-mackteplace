"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQ = void 0;
const mongoose_1 = require("mongoose");
const faqSchema = new mongoose_1.Schema({
    question: {
        type: String,
        required: [true, 'Question is required'],
        trim: true,
    },
    answer: {
        type: String,
        required: [true, 'Answer is required'],
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
faqSchema.index({ isActive: 1 });
exports.FAQ = (0, mongoose_1.model)('FAQ', faqSchema);
