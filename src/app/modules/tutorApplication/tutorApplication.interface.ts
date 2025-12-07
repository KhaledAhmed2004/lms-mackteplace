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
  userId: Types.ObjectId; // ref to User

  // Application Data
  subjects: string[]; // Which subjects they want to teach
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: Date;

  // Documents (uploaded files)
  cvUrl: string; // PDF file
  abiturCertificateUrl: string; // MANDATORY - German certificate
  educationProofUrls?: string[]; // Optional additional proofs

  // Status Tracking
  status: APPLICATION_STATUS;
  phase: 1 | 2 | 3; // 1=Applied, 2=Interview scheduled, 3=Approved
  rejectionReason?: string;

  // Admin Notes
  adminNotes?: string;

  // Timestamps
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
};

export type TutorApplicationModel = Model<ITutorApplication>;