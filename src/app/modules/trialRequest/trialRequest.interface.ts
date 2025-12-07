import { Model, Types } from 'mongoose';

export enum TRIAL_REQUEST_STATUS {
  PENDING = 'PENDING',           // Student sent request, waiting for tutor
  ACCEPTED = 'ACCEPTED',         // Tutor accepted, chat opened
  EXPIRED = 'EXPIRED',           // No tutor accepted within time limit
  CANCELLED = 'CANCELLED',       // Student cancelled before acceptance
}

export type ITrialRequest = {
  studentId: Types.ObjectId;
  subject: string;                    // Subject name (from Subject collection)
  description: string;                // What student needs help with
  preferredLanguage: 'ENGLISH' | 'GERMAN';
  preferredDateTime?: Date;           // Optional: When student wants trial
  status: TRIAL_REQUEST_STATUS;

  // Matching details
  acceptedTutorId?: Types.ObjectId;   // Tutor who accepted
  chatId?: Types.ObjectId;            // Created chat when accepted

  // Timestamps
  expiresAt: Date;                    // Auto-expire after 24 hours
  acceptedAt?: Date;
  cancelledAt?: Date;

  // Metadata
  cancellationReason?: string;
};

export type TrialRequestModel = Model<ITrialRequest>;