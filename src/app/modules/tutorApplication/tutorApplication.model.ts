import { model, Schema } from 'mongoose';
import {
  APPLICATION_STATUS,
  ITutorApplication,
  TutorApplicationModel,
} from './tutorApplication.interface';

const tutorApplicationSchema = new Schema<ITutorApplication>(
  {
    // Subjects to teach
    subjects: {
      type: [String],
      required: [true, 'At least one subject is required'],
      validate: {
        validator: (v: string[]) => v && v.length > 0,
        message: 'At least one subject must be selected',
      },
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

    // Documents (URLs from Cloudinary/S3)
    cvUrl: {
      type: String,
      required: [true, 'CV is required'],
    },
    abiturCertificateUrl: {
      type: String,
      required: [true, 'Abitur certificate is required'], // MANDATORY
    },
    educationProofUrls: {
      type: [String],
      default: [],
    },

    // Status
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
    reviewedAt: {
      type: Date,
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
tutorApplicationSchema.index({ userId: 1 });
tutorApplicationSchema.index({ status: 1, phase: 1 });
tutorApplicationSchema.index({ submittedAt: -1 });
tutorApplicationSchema.index({ email: 1 });

export const TutorApplication = model<ITutorApplication, TutorApplicationModel>(
  'TutorApplication',
  tutorApplicationSchema
);
