import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Chat } from '../chat/chat.model';
import {
  ITrialRequest,
  TRIAL_REQUEST_STATUS,
} from './trialRequest.interface';
import { TrialRequest } from './trialRequest.model';

/**
 * Create trial request (Student)
 */
const createTrialRequest = async (
  studentId: string,
  payload: Partial<ITrialRequest>
): Promise<ITrialRequest> => {
  // Verify student exists and has STUDENT role
  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  if (student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only students can create trial requests'
    );
  }

  // Check if student has pending trial request
  const pendingRequest = await TrialRequest.findOne({
    studentId: new Types.ObjectId(studentId),
    status: TRIAL_REQUEST_STATUS.PENDING,
  });

  if (pendingRequest) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a pending trial request. Please wait for a tutor to accept or cancel it.'
    );
  }

  // Create trial request
  const trialRequest = await TrialRequest.create({
    ...payload,
    studentId: new Types.ObjectId(studentId),
    status: TRIAL_REQUEST_STATUS.PENDING,
  });

  // Increment student trial request count
  await User.findByIdAndUpdate(studentId, {
    $inc: { 'studentProfile.trialRequestsCount': 1 },
  });

  // TODO: Send real-time notification to matching tutors
  // const matchingTutors = await User.find({
  //   role: USER_ROLES.TUTOR,
  //   'tutorProfile.subjects': payload.subject,
  //   'tutorProfile.isVerified': true
  // });
  // io.to(matchingTutors.map(t => t._id.toString())).emit('newTrialRequest', trialRequest);

  // TODO: Send email notification to admin
  // await sendEmail({
  //   to: ADMIN_EMAIL,
  //   subject: 'New Trial Request',
  //   template: 'new-trial-request',
  //   data: { studentName: student.name, subject: payload.subject }
  // });

  return trialRequest;
};

/**
 * Get matching trial requests for tutor
 * Shows PENDING requests in tutor's subjects
 */
const getMatchingTrialRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  // Get tutor's subjects
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can view trial requests');
  }

  const tutorSubjects = tutor.tutorProfile?.subjects || [];

  // Find matching requests
  const requestQuery = new QueryBuilder(
    TrialRequest.find({
      subject: { $in: tutorSubjects },
      status: TRIAL_REQUEST_STATUS.PENDING,
      expiresAt: { $gt: new Date() }, // Not expired
    }).populate('studentId', 'name profilePicture'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

/**
 * Get student's own trial requests
 */
const getMyTrialRequests = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const requestQuery = new QueryBuilder(
    TrialRequest.find({ studentId: new Types.ObjectId(studentId) })
      .populate('acceptedTutorId', 'name profilePicture')
      .populate('chatId'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

/**
 * Get all trial requests (Admin)
 */
const getAllTrialRequests = async (query: Record<string, unknown>) => {
  const requestQuery = new QueryBuilder(
    TrialRequest.find()
      .populate('studentId', 'name email profilePicture')
      .populate('acceptedTutorId', 'name email profilePicture')
      .populate('chatId'),
    query
  )
    .search(['subject', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single trial request
 */
const getSingleTrialRequest = async (id: string): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('acceptedTutorId', 'name email profilePicture phone')
    .populate('chatId');

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  return request;
};

/**
 * Accept trial request (Tutor)
 * Creates chat and connects student with tutor
 */
const acceptTrialRequest = async (
  requestId: string,
  tutorId: string
): Promise<ITrialRequest | null> => {
  // Verify request exists and is pending
  const request = await TrialRequest.findById(requestId);
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  if (request.status !== TRIAL_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This trial request is no longer available'
    );
  }

  // Check if expired
  if (new Date() > request.expiresAt) {
    request.status = TRIAL_REQUEST_STATUS.EXPIRED;
    await request.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This trial request has expired');
  }

  // Verify tutor
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
  }

  // Verify tutor teaches this subject
  if (!tutor.tutorProfile?.subjects?.includes(request.subject)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You do not teach this subject'
    );
  }

  // Create chat between student and tutor
  const chat = await Chat.create({
    participants: [request.studentId, new Types.ObjectId(tutorId)],
    // You can add more chat metadata here
  });

  // Update trial request
  request.status = TRIAL_REQUEST_STATUS.ACCEPTED;
  request.acceptedTutorId = new Types.ObjectId(tutorId);
  request.chatId = chat._id as Types.ObjectId;
  request.acceptedAt = new Date();
  await request.save();

  // TODO: Send real-time notification to student
  // io.to(request.studentId.toString()).emit('trialAccepted', {
  //   tutorName: tutor.name,
  //   chatId: chat._id
  // });

  // TODO: Send email to student
  // await sendEmail({
  //   to: student.email,
  //   subject: 'Your Trial Request Was Accepted!',
  //   template: 'trial-accepted',
  //   data: { tutorName: tutor.name, subject: request.subject }
  // });

  return request;
};

/**
 * Cancel trial request (Student)
 */
const cancelTrialRequest = async (
  requestId: string,
  studentId: string,
  cancellationReason: string
): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  // Verify ownership
  if (request.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own trial requests'
    );
  }

  // Can only cancel PENDING requests
  if (request.status !== TRIAL_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending trial requests can be cancelled'
    );
  }

  // Update request
  request.status = TRIAL_REQUEST_STATUS.CANCELLED;
  request.cancellationReason = cancellationReason;
  request.cancelledAt = new Date();
  await request.save();

  return request;
};

/**
 * Auto-expire trial requests (Cron job)
 * Should be called periodically to expire old requests
 */
const expireOldRequests = async (): Promise<number> => {
  const result = await TrialRequest.updateMany(
    {
      status: TRIAL_REQUEST_STATUS.PENDING,
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: TRIAL_REQUEST_STATUS.EXPIRED },
    }
  );

  return result.modifiedCount;
};

export const TrialRequestService = {
  createTrialRequest,
  getMatchingTrialRequests,
  getMyTrialRequests,
  getAllTrialRequests,
  getSingleTrialRequest,
  acceptTrialRequest,
  cancelTrialRequest,
  expireOldRequests,
};