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
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
exports.Subject = (0, mongoose_1.model)('Subject', subjectSchema);
