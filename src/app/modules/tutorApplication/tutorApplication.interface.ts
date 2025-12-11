import { Model, Types } from 'mongoose';

export enum APPLICATION_STATUS {
  SUBMITTED = 'SUBMITTED',
  DOCUMENTS_REVIEWED = 'DOCUMENTS_REVIEWED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_DONE = 'INTERVIEW_DONE',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type ITutorApplication = {
  _id: Types.ObjectId;

  // Application Data
  subjects: string[];
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: Date;

  // Documents (uploaded files)
  cv: string;
  abiturCertificate: string;
  officalIdDocument: string;

  // Status Tracking
  status: APPLICATION_STATUS;
  rejectionReason?: string;

  // Admin Notes
  adminNotes?: string;

  // Timestamps
  submittedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
};

export type TutorApplicationModel = Model<ITutorApplication>;
