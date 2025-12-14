import { model, Schema } from 'mongoose';
import {
  GRADE_LEVEL,
  ISessionRequest,
  REQUEST_TYPE,
  SCHOOL_TYPE,
  SessionRequestModel,
  SESSION_REQUEST_STATUS,
} from './sessionRequest.interface';

const sessionRequestSchema = new Schema<ISessionRequest>(
  {
    // Request type (for unified view)
    requestType: {
      type: String,
      enum: Object.values(REQUEST_TYPE),
      default: REQUEST_TYPE.SESSION,
    },

    // Student reference (Required - must be logged in)
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },

    // Academic Information (Required)
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    gradeLevel: {
      type: String,
      enum: Object.values(GRADE_LEVEL),
      required: [true, 'Grade level is required'],
    },
    schoolType: {
      type: String,
      enum: Object.values(SCHOOL_TYPE),
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

    // Request Status
    status: {
      type: String,
      enum: Object.values(SESSION_REQUEST_STATUS),
      default: SESSION_REQUEST_STATUS.PENDING,
    },

    // Matching details
    acceptedTutorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },

    // Timestamps & Expiration
    expiresAt: {
      type: Date,
      default: function () {
        const date = new Date();
        date.setDate(date.getDate() + 7); // 7 days from now
        return date;
      },
    },
    acceptedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },

    // Extension tracking
    isExtended: {
      type: Boolean,
      default: false,
    },
    extensionCount: {
      type: Number,
      default: 0,
    },
    reminderSentAt: {
      type: Date,
    },
    finalExpiresAt: {
      type: Date,
    },

    // Metadata
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
sessionRequestSchema.index({ studentId: 1 });
sessionRequestSchema.index({ subject: 1 });
sessionRequestSchema.index({ gradeLevel: 1 });
sessionRequestSchema.index({ schoolType: 1 });
sessionRequestSchema.index({ status: 1 });
sessionRequestSchema.index({ expiresAt: 1 });
sessionRequestSchema.index({ acceptedTutorId: 1 });
sessionRequestSchema.index({ createdAt: -1 }); // Latest first

// Compound index for tutor matching queries
sessionRequestSchema.index({ status: 1, subject: 1, expiresAt: 1 });


export const SessionRequest = model<ISessionRequest, SessionRequestModel>(
  'SessionRequest',
  sessionRequestSchema
);
