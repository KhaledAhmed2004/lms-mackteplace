import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';
import { APPLICATION_STATUS } from '../tutorApplication/tutorApplication.interface';
import {
  IInterviewSlot,
  INTERVIEW_SLOT_STATUS,
} from './interviewSlot.interface';
import { InterviewSlot } from './interviewSlot.model';
// import { generateGoogleMeetLink } from '../../../helpers/googleMeetHelper'; // Will implement later

/**
 * Create interview slot (Admin only)
 */
const createInterviewSlot = async (
  adminId: string,
  payload: Partial<IInterviewSlot>
): Promise<IInterviewSlot> => {
  // Verify admin exists
  const admin = await User.findById(adminId);
  if (!admin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  // Create slot
  const slotData = {
    ...payload,
    adminId: new Types.ObjectId(adminId),
    status: INTERVIEW_SLOT_STATUS.AVAILABLE,
  };

  const slot = await InterviewSlot.create(slotData);

  return slot;
};

/**
 * Get all interview slots with filtering
 * Admin: See all slots
 * Applicant: See only available slots
 */
const getAllInterviewSlots = async (
  query: Record<string, unknown>,
  userId?: string,
  userRole?: string
) => {
  let filter = {};

  // If applicant, only show available slots
  if (userRole === 'APPLICANT') {
    filter = { status: INTERVIEW_SLOT_STATUS.AVAILABLE };
  }

  const slotQuery = new QueryBuilder(
    InterviewSlot.find(filter).populate('adminId', 'name email').populate('applicantId', 'name email'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await slotQuery.modelQuery;
  const meta = await slotQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single interview slot by ID
 */
const getSingleInterviewSlot = async (id: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id)
    .populate('adminId', 'name email')
    .populate('applicantId', 'name email')
    .populate('applicationId');

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  return slot;
};

/**
 * Book interview slot (Applicant)
 */
const bookInterviewSlot = async (
  slotId: string,
  applicantId: string,
  applicationId: string
): Promise<IInterviewSlot | null> => {
  // Verify slot exists and is available
  const slot = await InterviewSlot.findById(slotId);
  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Interview slot is not available'
    );
  }

  // Verify application exists and belongs to applicant
  const application = await TutorApplication.findById(applicationId);
  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.userId.toString() !== applicantId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This application does not belong to you'
    );
  }

  // Check if application is in correct status
  if (application.status !== APPLICATION_STATUS.DOCUMENTS_REVIEWED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application must be in DOCUMENTS_REVIEWED status to book interview'
    );
  }

  // Check if applicant already has a booked slot
  const existingBooking = await InterviewSlot.findOne({
    applicantId: new Types.ObjectId(applicantId),
    status: INTERVIEW_SLOT_STATUS.BOOKED,
  });

  if (existingBooking) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a booked interview slot'
    );
  }

  // Update slot
  slot.status = INTERVIEW_SLOT_STATUS.BOOKED;
  slot.applicantId = new Types.ObjectId(applicantId);
  slot.applicationId = new Types.ObjectId(applicationId);
  slot.bookedAt = new Date();

  // TODO: Generate Google Meet link
  // slot.googleMeetLink = await generateGoogleMeetLink({
  //   summary: 'Tutor Application Interview',
  //   description: `Interview for ${application.name}`,
  //   startTime: slot.startTime,
  //   endTime: slot.endTime,
  //   attendees: [application.email, admin.email]
  // });

  await slot.save();

  // Update application status to INTERVIEW_SCHEDULED
  await TutorApplication.findByIdAndUpdate(applicationId, {
    status: APPLICATION_STATUS.INTERVIEW_SCHEDULED,
  });

  // TODO: Send email notification to applicant and admin
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Interview Scheduled',
  //   template: 'interview-scheduled',
  //   data: { name: application.name, meetLink: slot.googleMeetLink, startTime: slot.startTime }
  // });

  return slot;
};

/**
 * Cancel interview slot
 * Admin or Applicant can cancel
 */
const cancelInterviewSlot = async (
  slotId: string,
  userId: string,
  cancellationReason: string
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(slotId);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only booked slots can be cancelled'
    );
  }

  // Verify user is either admin or applicant of this slot
  if (
    slot.adminId.toString() !== userId &&
    slot.applicantId?.toString() !== userId
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this slot'
    );
  }

  // Update slot
  slot.status = INTERVIEW_SLOT_STATUS.CANCELLED;
  slot.cancellationReason = cancellationReason;
  slot.cancelledAt = new Date();
  await slot.save();

  // Update application status back to DOCUMENTS_REVIEWED
  if (slot.applicationId) {
    await TutorApplication.findByIdAndUpdate(slot.applicationId, {
      status: APPLICATION_STATUS.DOCUMENTS_REVIEWED,
    });
  }

  // TODO: Send cancellation email
  // await sendEmail({
  //   to: [applicant.email, admin.email],
  //   subject: 'Interview Cancelled',
  //   template: 'interview-cancelled',
  //   data: { reason: cancellationReason }
  // });

  return slot;
};

/**
 * Mark interview as completed (Admin only)
 */
const markAsCompleted = async (slotId: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(slotId);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only booked slots can be marked as completed'
    );
  }

  // Update slot
  slot.status = INTERVIEW_SLOT_STATUS.COMPLETED;
  slot.completedAt = new Date();
  await slot.save();

  // Update application status to INTERVIEW_DONE
  if (slot.applicationId) {
    await TutorApplication.findByIdAndUpdate(slot.applicationId, {
      status: APPLICATION_STATUS.INTERVIEW_DONE,
    });
  }

  return slot;
};

/**
 * Update interview slot (Admin only)
 */
const updateInterviewSlot = async (
  id: string,
  payload: Partial<IInterviewSlot>
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  // Don't allow updating booked/completed/cancelled slots
  if (slot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot update slot that is not available'
    );
  }

  const updated = await InterviewSlot.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updated;
};

/**
 * Delete interview slot (Admin only)
 */
const deleteInterviewSlot = async (id: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  // Don't allow deleting booked slots
  if (slot.status === INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot delete booked slot. Cancel it first.'
    );
  }

  const result = await InterviewSlot.findByIdAndDelete(id);
  return result;
};

export const InterviewSlotService = {
  createInterviewSlot,
  getAllInterviewSlots,
  getSingleInterviewSlot,
  bookInterviewSlot,
  cancelInterviewSlot,
  markAsCompleted,
  updateInterviewSlot,
  deleteInterviewSlot,
};