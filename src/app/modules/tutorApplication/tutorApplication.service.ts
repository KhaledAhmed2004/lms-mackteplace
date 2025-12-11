import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import {
  APPLICATION_STATUS,
  ITutorApplication,
} from './tutorApplication.interface';
import { TutorApplication } from './tutorApplication.model';
// import { sendEmail } from '../../../helpers/emailHelper'; // Will implement later

const submitApplication = async (
  userId: string,
  payload: Partial<ITutorApplication>
): Promise<ITutorApplication> => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Check if user already has an application
  const existingApplication = await TutorApplication.findOne({ userId });
  if (existingApplication) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have already submitted an application'
    );
  }

  // Create application
  const applicationData = {
    ...payload,
    status: APPLICATION_STATUS.SUBMITTED,
    submittedAt: new Date(),
  };

  const application = await TutorApplication.create(applicationData);

  // Update user role to APPLICANT
  await User.findByIdAndUpdate(userId, {
    role: USER_ROLES.APPLICANT,
    'tutorProfile.subjects': payload.subjects,
    'tutorProfile.address': payload.address,
    'tutorProfile.birthDate': payload.birthDate,
    'tutorProfile.cvUrl': payload.cvUrl,
    'tutorProfile.abiturCertificateUrl': payload.abiturCertificateUrl,
    'tutorProfile.educationProofUrls': payload.educationProofUrls,
  });

  // TODO: Send email notification to admin
  // await sendEmail({
  //   to: ADMIN_EMAIL,
  //   subject: 'New Tutor Application Received',
  //   template: 'new-application',
  //   data: { applicantName: payload.name }
  // });

  return application;
};

/**
 * Get my application (applicant)
 */
const getMyApplication = async (
  userId: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findOne({ userId }).populate(
    'userId',
    'name email profilePicture'
  );

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
  const applicationQuery = new QueryBuilder(
    TutorApplication.find().populate(
      'userId',
      'name email profilePicture phone'
    ),
    query
  )
    .search(['name', 'email', 'phone']) // Search by name, email, phone
    .filter() // Filter by status, phase, etc.
    .sort() // Sort
    .paginate() // Pagination
    .fields(); // Field selection

  const result = await applicationQuery.modelQuery;
  const meta = await applicationQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single application by ID (admin)
 */
const getSingleApplication = async (
  id: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id).populate(
    'userId',
    'name email profilePicture phone status'
  );

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  return application;
};

/**
 * Approve application to Phase 2 (Interview scheduling)
 * Admin only
 */
const approveToPhase2 = async (
  id: string,
  adminNotes?: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status !== APPLICATION_STATUS.SUBMITTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application must be in SUBMITTED status'
    );
  }

  // Update application
  application.status = APPLICATION_STATUS.DOCUMENTS_REVIEWED;
  application.phase = 2;
  application.reviewedAt = new Date();
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  await application.save();

  // TODO: Send email to applicant with interview scheduling link
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Application Approved - Schedule Interview',
  //   template: 'interview-invitation',
  //   data: { name: application.name, interviewLink: INTERVIEW_LINK }
  // });

  return application;
};

/**
 * Reject application
 * Admin only
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

  // TODO: Send rejection email
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Application Update',
  //   template: 'application-rejected',
  //   data: { name: application.name, reason: rejectionReason }
  // });

  return application;
};

/**
 * Mark as tutor (Final approval - Phase 3)
 * Admin only
 * Changes user role from APPLICANT to TUTOR
 */
const markAsTutor = async (id: string): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot approve a rejected application'
    );
  }

  // Update application
  application.status = APPLICATION_STATUS.APPROVED;
  application.phase = 3;
  application.approvedAt = new Date();
  await application.save();

  // Update user role to TUTOR
  await User.findByIdAndUpdate(application.userId, {
    role: USER_ROLES.TUTOR,
    'tutorProfile.isVerified': true,
    'tutorProfile.verificationStatus': 'APPROVED',
    'tutorProfile.onboardingPhase': 3,
  });

  // TODO: Send welcome email
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Welcome to Our Platform!',
  //   template: 'tutor-approved',
  //   data: { name: application.name }
  // });

  return application;
};

/**
 * Update application status (admin only)
 * Generic update function
 */
const updateApplicationStatus = async (
  id: string,
  payload: Partial<ITutorApplication>
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  const updated = await TutorApplication.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updated;
};

/**
 * Delete application (admin only)
 * Hard delete
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
  approveToPhase2,
  rejectApplication,
  markAsTutor,
  updateApplicationStatus,
  deleteApplication,
};
