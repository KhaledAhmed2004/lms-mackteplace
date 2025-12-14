import { Model, Types } from 'mongoose';

export enum TRIAL_REQUEST_STATUS {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED', // Tutor accepted, chat opened
  EXPIRED = 'EXPIRED', // No tutor accepted within time limit
  CANCELLED = 'CANCELLED', // Student cancelled before acceptance
}

// Request type to distinguish between trial and session requests in unified view
export enum REQUEST_TYPE {
  TRIAL = 'TRIAL',
  SESSION = 'SESSION',
}

// School types in Germany
export enum SCHOOL_TYPE {
  GRUNDSCHULE = 'GRUNDSCHULE', // Primary school (grades 1-4)
  HAUPTSCHULE = 'HAUPTSCHULE', // Secondary general school
  REALSCHULE = 'REALSCHULE', // Intermediate school
  GYMNASIUM = 'GYMNASIUM', // Grammar school (academic track)
  GESAMTSCHULE = 'GESAMTSCHULE', // Comprehensive school
  BERUFSSCHULE = 'BERUFSSCHULE', // Vocational school
  UNIVERSITY = 'UNIVERSITY', // University/Higher education
  OTHER = 'OTHER',
}

// Grade levels
export enum GRADE_LEVEL {
  GRADE_1 = '1',
  GRADE_2 = '2',
  GRADE_3 = '3',
  GRADE_4 = '4',
  GRADE_5 = '5',
  GRADE_6 = '6',
  GRADE_7 = '7',
  GRADE_8 = '8',
  GRADE_9 = '9',
  GRADE_10 = '10',
  GRADE_11 = '11',
  GRADE_12 = '12',
  GRADE_13 = '13',
  UNIVERSITY_SEMESTER_1 = 'SEMESTER_1',
  UNIVERSITY_SEMESTER_2 = 'SEMESTER_2',
  UNIVERSITY_SEMESTER_3 = 'SEMESTER_3',
  UNIVERSITY_SEMESTER_4 = 'SEMESTER_4',
  UNIVERSITY_SEMESTER_5_PLUS = 'SEMESTER_5_PLUS',
}

// Guardian info for students under 18 (nested inside studentInfo)
export type IGuardianInfo = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

// Student info collected during trial request
// If under 18: only name required, email/password comes from guardian
// If 18+: email and password required for the student
export type IStudentInfo = {
  name: string; // Full name (always required)
  email?: string; // Required only if 18+ (student's own email)
  password?: string; // Required only if 18+ (student's own password)
  isUnder18: boolean;
  dateOfBirth?: Date;
  // Guardian info nested inside studentInfo (required if under 18)
  guardianInfo?: IGuardianInfo;
};

export type ITrialRequest = {
  // Request type (for unified view)
  requestType: REQUEST_TYPE;

  // Student reference (if already registered user)
  studentId?: Types.ObjectId;

  // Student Information (Required) - collected during trial request
  studentInfo: IStudentInfo;

  // Academic Information (Required)
  subject: Types.ObjectId; // Reference to Subject collection
  gradeLevel: GRADE_LEVEL;
  schoolType: SCHOOL_TYPE;

  // Learning Details
  description: string; // What student needs help with
  learningGoals?: string; // Optional: Specific learning goals
  preferredLanguage: 'ENGLISH' | 'GERMAN';
  preferredDateTime?: Date; // Optional: When student wants trial

  // Documents (Optional)
  documents?: string[]; // Array of document URLs (uploaded files)

  // Request Status
  status: TRIAL_REQUEST_STATUS;

  // Matching details
  acceptedTutorId?: Types.ObjectId; // Tutor who accepted
  chatId?: Types.ObjectId; // Created chat when accepted

  // Timestamps & Expiration
  expiresAt: Date; // Auto-expire after 7 days
  acceptedAt?: Date;
  cancelledAt?: Date;

  // Extension tracking
  isExtended?: boolean; // Whether student requested extension
  extensionCount?: number; // How many times extended (max 1)
  reminderSentAt?: Date; // When 7-day reminder was sent
  finalExpiresAt?: Date; // 2-3 days after reminder, auto-delete if no response

  // Metadata
  cancellationReason?: string;
};

export type TrialRequestModel = Model<ITrialRequest>;
