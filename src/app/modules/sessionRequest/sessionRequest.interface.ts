import { Model, Types } from 'mongoose';

export enum SESSION_REQUEST_STATUS {
  PENDING = 'PENDING', // Student sent request, waiting for tutor
  ACCEPTED = 'ACCEPTED', // Tutor accepted, chat opened
  EXPIRED = 'EXPIRED', // No tutor accepted within time limit
  CANCELLED = 'CANCELLED', // Student cancelled before acceptance
}

// Reuse enums from trialRequest for consistency
export { SCHOOL_TYPE, GRADE_LEVEL } from '../trialRequest/trialRequest.interface';

export type ISessionRequest = {
  // Student reference (Required - must be logged in)
  studentId: Types.ObjectId;

  // Academic Information (Required)
  subject: Types.ObjectId; // Reference to Subject collection
  gradeLevel: string; // Using string to match GRADE_LEVEL enum values
  schoolType: string; // Using string to match SCHOOL_TYPE enum values

  // Learning Details
  description: string; // What student needs help with
  learningGoals?: string; // Optional: Specific learning goals
  preferredDateTime?: Date; // Optional: When student wants session

  // Documents (Optional)
  documents?: string[]; // Array of document URLs (uploaded files)

  // Request Status
  status: SESSION_REQUEST_STATUS;

  // Matching details
  acceptedTutorId?: Types.ObjectId; // Tutor who accepted
  chatId?: Types.ObjectId; // Created chat when accepted

  // Timestamps
  expiresAt: Date; // Auto-expire after 24 hours
  acceptedAt?: Date;
  cancelledAt?: Date;

  // Metadata
  cancellationReason?: string;
};

export type SessionRequestModel = Model<ISessionRequest>;
