import { model, Schema } from 'mongoose';
import {
  APPLICATION_STATUS,
  ITutorApplication,
  TutorApplicationModel,
} from './tutorApplication.interface';

const tutorApplicationSchema = new Schema<ITutorApplication>(
  {
    subjects: {
      type: [String],
      required: [true, 'At least one subject is required'],
      minlength: [1, 'At least one subject must be selected'],
    },
    // Personal Information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    birthDate: {
      type: Date,
      required: [true, 'Birth date is required'],
    },

    // Documents (must match your interface exactly)
    cv: {
      type: String,
      required: [true, 'CV is required'],
    },
    abiturCertificate: {
      type: String,
      required: [true, 'Abitur certificate is required'],
    },
    officalIdDocument: {
      type: String,
      required: [true, 'Official ID document is required'],
    },

    // Status Tracking
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.SUBMITTED,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Admin Notes
    adminNotes: {
      type: String,
      trim: true,
    },

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
tutorApplicationSchema.index({ email: 1 });
tutorApplicationSchema.index({ status: 1 });
tutorApplicationSchema.index({ submittedAt: -1 });

export const TutorApplication = model<ITutorApplication, TutorApplicationModel>(
  'TutorApplication',
  tutorApplicationSchema
);
