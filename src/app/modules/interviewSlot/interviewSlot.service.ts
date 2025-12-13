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
  const meta = await slotQuery.getPaginationInfo();

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

  // Get user to check email match
  const user = await User.findById(applicantId);
  if (!user || application.email !== user.email) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This application does not belong to you'
    );
  }

  // Check if application is in correct status (SUBMITTED or REVISION can book)
  if (
    application.status !== APPLICATION_STATUS.SUBMITTED &&
    application.status !== APPLICATION_STATUS.REVISION
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application must be in SUBMITTED or REVISION status to book interview'
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
      'You already have a booked interview slot. Cancel it first to book a new one.'
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

  // TODO: Send email notification to applicant with meeting details
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Interview Scheduled - Tutor Application',
  //   template: 'interview-scheduled',
  //   data: {
  //     name: application.name,
  //     meetLink: slot.googleMeetLink,
  //     startTime: slot.startTime,
  //     endTime: slot.endTime
  //   }
  // });

  return slot;
};

/**
 * Cancel interview slot
 * Admin or Applicant can cancel (must be at least 1 hour before interview)
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
  const user = await User.findById(userId);
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isSlotOwner = slot.applicantId?.toString() === userId;

  if (!isAdmin && !isSlotOwner) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this slot'
    );
  }

  // Check if cancellation is at least 1 hour before interview (for applicants only)
  if (!isAdmin) {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (slot.startTime <= oneHourFromNow) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot cancel interview less than 1 hour before the scheduled time'
      );
    }
  }

  // Update slot - make it available again for others to book
  slot.status = INTERVIEW_SLOT_STATUS.CANCELLED;
  slot.cancellationReason = cancellationReason;
  slot.cancelledAt = new Date();
  await slot.save();

  // Update application status back to SUBMITTED (so they can book again)
  if (slot.applicationId) {
    await TutorApplication.findByIdAndUpdate(slot.applicationId, {
      status: APPLICATION_STATUS.SUBMITTED,
    });
  }

  // TODO: Send cancellation email
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Interview Cancelled',
  //   template: 'interview-cancelled',
  //   data: { reason: cancellationReason, startTime: slot.startTime }
  // });

  return slot;
};

/**
 * Mark interview as completed (Admin only)
 * After completion, admin can approve/reject the application separately
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

  // Application status remains SUBMITTED - admin will approve/reject separately

  return slot;
};

/**
 * Reschedule interview slot (Applicant)
 * Cancel current booking and book a new slot in one action
 */
const rescheduleInterviewSlot = async (
  currentSlotId: string,
  newSlotId: string,
  applicantId: string
): Promise<IInterviewSlot | null> => {
  // Get current slot
  const currentSlot = await InterviewSlot.findById(currentSlotId);
  if (!currentSlot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Current interview slot not found');
  }

  // Verify applicant owns this slot
  if (currentSlot.applicantId?.toString() !== applicantId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reschedule this slot'
    );
  }

  if (currentSlot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only booked slots can be rescheduled'
    );
  }

  // Check if reschedule is at least 1 hour before current interview
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (currentSlot.startTime <= oneHourFromNow) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reschedule interview less than 1 hour before the scheduled time'
    );
  }

  // Get new slot
  const newSlot = await InterviewSlot.findById(newSlotId);
  if (!newSlot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'New interview slot not found');
  }

  if (newSlot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'New slot is not available'
    );
  }

  // Save applicant and application IDs before clearing
  const savedApplicantId = currentSlot.applicantId;
  const savedApplicationId = currentSlot.applicationId;

  // Cancel current slot (make it available again)
  currentSlot.status = INTERVIEW_SLOT_STATUS.AVAILABLE;
  currentSlot.applicantId = undefined;
  currentSlot.applicationId = undefined;
  currentSlot.bookedAt = undefined;
  await currentSlot.save();

  // Book new slot
  newSlot.status = INTERVIEW_SLOT_STATUS.BOOKED;
  newSlot.applicantId = savedApplicantId;
  newSlot.applicationId = savedApplicationId;
  newSlot.bookedAt = new Date();
  await newSlot.save();

  // TODO: Send reschedule email notification
  // await sendEmail({
  //   to: applicant.email,
  //   subject: 'Interview Rescheduled',
  //   template: 'interview-rescheduled',
  //   data: {
  //     oldTime: currentSlot.startTime,
  //     newTime: newSlot.startTime,
  //     meetLink: newSlot.googleMeetLink
  //   }
  // });

  return newSlot;
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
  rescheduleInterviewSlot,
  markAsCompleted,
  updateInterviewSlot,
  deleteInterviewSlot,
};