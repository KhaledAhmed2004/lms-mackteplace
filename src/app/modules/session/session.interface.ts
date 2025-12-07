import { Model, Types } from 'mongoose';

export enum SESSION_STATUS {
  SCHEDULED = 'SCHEDULED',       // Session booked, waiting to start
  IN_PROGRESS = 'IN_PROGRESS',   // Currently happening
  COMPLETED = 'COMPLETED',       // Session finished
  CANCELLED = 'CANCELLED',       // Cancelled by tutor or student
  NO_SHOW = 'NO_SHOW',          // Student didn't attend
}

export type ISession = {
  studentId: Types.ObjectId;
  tutorId: Types.ObjectId;
  subject: string;
  description?: string;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;                    // Duration in minutes

  // Pricing (based on student's subscription tier)
  pricePerHour: number;                // EUR/hour (30, 28, or 25)
  totalPrice: number;                  // Calculated price for this session

  // Google Meet
  googleMeetLink?: string;
  googleCalendarEventId?: string;

  // Status tracking
  status: SESSION_STATUS;

  // Related records
  messageId?: Types.ObjectId;          // Session proposal message
  chatId?: Types.ObjectId;             // Chat where booked
  reviewId?: Types.ObjectId;           // Session review (after completion)

  // Cancellation
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
};

export type SessionModel = Model<ISession>;