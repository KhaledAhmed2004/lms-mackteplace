import { model, Schema } from 'mongoose';
import { APPLICATION_STATUS, ITutorApplication, TutorApplicationModel } from './tutorApplication.interface';

const tutorApplicationSchema = new Schema<ITutorApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true, // One application per user
    },

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
    phase: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
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

// Pre-save hook to update phase based on status
tutorApplicationSchema.pre('save', function (next) {
  if (this.status === APPLICATION_STATUS.APPROVED) {
    this.phase = 3;
  } else if (
    this.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED ||
    this.status === APPLICATION_STATUS.INTERVIEW_DONE
  ) {
    this.phase = 2;
  } else {
    this.phase = 1;
  }
  next();
});

export const TutorApplication = model<ITutorApplication, TutorApplicationModel>(
  'TutorApplication',
  tutorApplicationSchema
);