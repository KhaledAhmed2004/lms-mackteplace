import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import {
  APPLICATION_STATUS,
  ITutorApplication,
} from './tutorApplication.interface';
import { TutorApplication } from './tutorApplication.model';

type TApplicationPayload = {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  subjects: string[];
  cv: string;
  abiturCertificate: string;
  officialIdDocument: string;
};

/**
 * Submit application (PUBLIC - creates user + application)
 * First-time registration for tutors
 */
const submitApplication = async (payload: TApplicationPayload) => {
  // 1. Check if email already exists
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already registered');
  }

  // Check if application with this email already exists
  const existingApplication = await TutorApplication.findOne({
    email: payload.email,
  });
  if (existingApplication) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'An application with this email already exists'
    );
  }

  // 2. Create new User with APPLICANT role
  // Note: Password will be hashed by User model's pre-save hook
  const newUser = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    role: USER_ROLES.APPLICANT,
    dateOfBirth: new Date(payload.birthDate),
    tutorProfile: {
      subjects: payload.subjects,
      cvUrl: payload.cv,
      abiturCertificateUrl: payload.abiturCertificate,
    },
  });

  // 4. Create TutorApplication
  const application = await TutorApplication.create({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    birthDate: new Date(payload.birthDate),
    street: payload.street,
    houseNumber: payload.houseNumber,
    zipCode: payload.zipCode,
    city: payload.city,
    subjects: payload.subjects,
    cv: payload.cv,
    abiturCertificate: payload.abiturCertificate,
    officialIdDocument: payload.officialIdDocument,
    status: APPLICATION_STATUS.SUBMITTED,
    submittedAt: new Date(),
  });

  return { application, user: { _id: newUser._id, email: newUser.email } };
};

// Get my application (for logged in applicant)
const getMyApplication = async (
  userEmail: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findOne({
    email: userEmail,
  }).populate({ path: 'subjects', select: 'name -_id' });

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No application found');
  }

  return application;
};

/**
 * Get all applications (admin)
 * With filtering, searching, pagination
 */
const getAllApplications = async (query: Record<string, unknown>) => {
  const applicationQuery = new QueryBuilder(TutorApplication.find(), query)
    .search(['name', 'email', 'phone', 'city'])
    .filter()
    .sort()
    .paginate()
    .fields();

  // Add populate for subjects
  applicationQuery.modelQuery = applicationQuery.modelQuery.populate({
    path: 'subjects',
    select: 'name -_id',
  });

  // Execute query
  const result = await applicationQuery.modelQuery;
  const meta = await applicationQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

// Get single application by ID (admin)
const getSingleApplication = async (
  id: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id).populate({
    path: 'subjects',
    select: 'name -_id',
  });

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  return application;
};

/**
 * Select application for interview (admin only)
 * After initial review, admin selects candidate for interview
 */
const selectForInterview = async (
  id: string,
  adminNotes?: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application is already selected for interview'
    );
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application is already approved'
    );
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot select a rejected application for interview'
    );
  }

  // Only SUBMITTED or REVISION status can be selected for interview
  if (
    application.status !== APPLICATION_STATUS.SUBMITTED &&
    application.status !== APPLICATION_STATUS.REVISION
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only submitted or revision applications can be selected for interview'
    );
  }

  // Update application status
  application.status = APPLICATION_STATUS.SELECTED_FOR_INTERVIEW;
  application.selectedForInterviewAt = new Date();
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  await application.save();

  // TODO: Send email notification to applicant about interview selection

  return application;
};

/**
 * Approve application (admin only)
 * Changes status to APPROVED and user role to TUTOR
 * Can only approve after interview (SELECTED_FOR_INTERVIEW status)
 */
const approveApplication = async (
  id: string,
  adminNotes?: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application is already approved'
    );
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot approve a rejected application'
    );
  }

  // Must be SELECTED_FOR_INTERVIEW to approve (after interview)
  if (application.status !== APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application must be selected for interview before approval. Please select for interview first.'
    );
  }

  // Update application status
  application.status = APPLICATION_STATUS.APPROVED;
  application.approvedAt = new Date();
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  await application.save();

  // Update user role to TUTOR
  await User.findOneAndUpdate(
    { email: application.email },
    {
      role: USER_ROLES.TUTOR,
      'tutorProfile.isVerified': true,
      'tutorProfile.verificationStatus': 'APPROVED',
    }
  );

  return application;
};

/**
 * Reject application (admin only)
 */
const rejectApplication = async (
  id: string,
  rejectionReason: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reject an approved application'
    );
  }

  // Update application
  application.status = APPLICATION_STATUS.REJECTED;
  application.rejectionReason = rejectionReason;
  application.rejectedAt = new Date();
  await application.save();

  return application;
};

/**
 * Send application for revision (admin only)
 * Admin requests the applicant to fix/update something
 */
const sendForRevision = async (
  id: string,
  revisionNote: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot request revision for an approved application'
    );
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot request revision for a rejected application'
    );
  }

  // Update application
  application.status = APPLICATION_STATUS.REVISION;
  application.revisionNote = revisionNote;
  application.revisionRequestedAt = new Date();
  await application.save();

  // TODO: Send email notification to applicant about revision request

  return application;
};

/**
 * Delete application (admin only)
 */
const deleteApplication = async (
  id: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  const result = await TutorApplication.findByIdAndDelete(id);
  return result;
};

export const TutorApplicationService = {
  submitApplication,
  getMyApplication,
  getAllApplications,
  getSingleApplication,
  selectForInterview,
  approveApplication,
  rejectApplication,
  sendForRevision,
  deleteApplication,
};
