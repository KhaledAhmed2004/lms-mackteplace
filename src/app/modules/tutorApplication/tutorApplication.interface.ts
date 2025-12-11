import { Model, Types } from 'mongoose';

// Simple status - NO phases
export enum APPLICATION_STATUS {
  SUBMITTED = 'SUBMITTED',
  REVISION = 'REVISION', // Admin requests changes
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type ITutorApplication = {
  _id: Types.ObjectId;

  // Application Data
  subjects: Types.ObjectId[];
  name: string;
  email: string;
  phone: string;

  // Address (structured)
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;

  birthDate: Date;

  // Documents (all mandatory)
  cv: string;
  abiturCertificate: string;
  officialIdDocument: string;

  // Status Tracking (simple)
  status: APPLICATION_STATUS;
  rejectionReason?: string;
  revisionNote?: string; // Admin's note for what needs to be fixed

  // Admin Notes
  adminNotes?: string;

  // Timestamps
  submittedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  revisionRequestedAt?: Date;
};

export type TutorApplicationModel = Model<ITutorApplication>;
