import { model, Schema } from 'mongoose';
import { ISession, SessionModel, SESSION_STATUS } from './session.interface';

const sessionSchema = new Schema<ISession>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    tutorId: {
      type: Schema.Types.ObjectId,
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
      required: [true, 'Duration is required'], // in minutes
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'], // EUR
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'], // EUR
    },
    googleMeetLink: {
      type: String,
    },
    googleCalendarEventId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionReview',
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
sessionSchema.index({ studentId: 1, createdAt: -1 });
sessionSchema.index({ tutorId: 1, createdAt: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ startTime: 1, endTime: 1 });
sessionSchema.index({ chatId: 1 });

// Compound index for upcoming sessions
sessionSchema.index({ status: 1, startTime: 1 });

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
  next();
});

export const Session = model<ISession, SessionModel>('Session', sessionSchema);