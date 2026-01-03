import { Model, Types } from 'mongoose';

export enum SESSION_STATUS {
  AWAITING_RESPONSE = 'AWAITING_RESPONSE', // Tutor proposed, waiting for student acceptance
  SCHEDULED = 'SCHEDULED',                 // Session booked, waiting to start
  STARTING_SOON = 'STARTING_SOON',         // Within 10 minutes of start time
  IN_PROGRESS = 'IN_PROGRESS',             // Currently happening
  COMPLETED = 'COMPLETED',                 // Session finished
  CANCELLED = 'CANCELLED',                 // Cancelled by tutor or student
  EXPIRED = 'EXPIRED',                     // Scheduled end time passed without completion
  NO_SHOW = 'NO_SHOW',                     // Student didn't attend
  RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED', // One party requested reschedule
}

export enum RESCHEDULE_STATUS {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PAYMENT_STATUS {
  PENDING = 'PENDING',       // Not yet paid
  PAID = 'PAID',             // Payment successful
  FAILED = 'FAILED',         // Payment failed
  REFUNDED = 'REFUNDED',     // Payment refunded (e.g., session cancelled)
}

export type IRescheduleRequest = {
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  newStartTime: Date;
  newEndTime: Date;
  reason?: string;
  status: RESCHEDULE_STATUS;
  respondedAt?: Date;
  respondedBy?: Types.ObjectId;
};

export type ISession = {
  studentId: Types.ObjectId;
  tutorId: Types.ObjectId;
  subject: string;
  description?: string;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;                    // Duration in minutes (fixed 60)
  bufferMinutes: number;               // Extra buffer time (default 10 minutes)

  // Pricing (based on student's subscription tier)
  pricePerHour: number;                // EUR/hour (30, 28, or 25)
  totalPrice: number;                  // Calculated price for this session
  bufferPrice: number;                 // Price for buffer time (charged separately)

  // Google Meet
  googleMeetLink?: string;
  googleCalendarEventId?: string;

  // Status tracking
  status: SESSION_STATUS;
  paymentStatus: PAYMENT_STATUS;

  // Trial session flag
  isTrial: boolean;                    // True if this is a free trial session

  // Related records
  messageId?: Types.ObjectId;          // Session proposal message
  chatId?: Types.ObjectId;             // Chat where booked
  reviewId?: Types.ObjectId;           // Session review (after completion) - student reviews tutor
  tutorFeedbackId?: Types.ObjectId;    // Tutor feedback (after completion) - tutor reviews student
  trialRequestId?: Types.ObjectId;     // Trial request this session was created from

  // Reschedule
  rescheduleRequest?: IRescheduleRequest;
  previousStartTime?: Date;            // Original start time before reschedule
  previousEndTime?: Date;              // Original end time before reschedule

  // Cancellation
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;
};

export type SessionModel = Model<ISession>;