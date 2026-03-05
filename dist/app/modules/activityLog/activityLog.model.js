"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = void 0;
const mongoose_1 = require("mongoose");
const activityLog_interface_1 = require("./activityLog.interface");
const activityLogSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    actionType: {
        type: String,
        enum: activityLog_interface_1.ACTION_TYPES,
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    entityType: {
        type: String,
        enum: activityLog_interface_1.ENTITY_TYPES,
        required: true,
    },
    entityId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: false,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    status: {
        type: String,
        enum: activityLog_interface_1.ACTIVITY_STATUS,
        default: 'success',
    },
}, {
    timestamps: true,
});
exports.ActivityLog = (0, mongoose_1.model)('ActivityLog', activityLogSchema);
