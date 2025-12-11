import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Chat } from '../chat/chat.model';
import { Subject } from '../subject/subject.model';
import { TrialRequest } from '../trialRequest/trialRequest.model';
import { TRIAL_REQUEST_STATUS } from '../trialRequest/trialRequest.interface';
import {
  ISessionRequest,
  SESSION_REQUEST_STATUS,
} from './sessionRequest.interface';
import { SessionRequest } from './sessionRequest.model';

/**
 * Create session request (Returning Student only)
 * Must be logged in and have completed trial
 */
const createSessionRequest = async (
  studentId: string,
  payload: Partial<ISessionRequest>
): Promise<ISessionRequest> => {
  // Validate subject exists
  const subjectExists = await Subject.findById(payload.subject);
  if (!subjectExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  // Verify student exists and has completed trial
  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  if (student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only students can create session requests'
    );
  }

  // Must have completed trial to create session request
  if (!student.studentProfile?.hasCompletedTrial) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You must complete a trial session before requesting more sessions. Please create a trial request first.'
    );
  }

  // Check if student has pending session request
  const pendingSessionRequest = await SessionRequest.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SESSION_REQUEST_STATUS.PENDING,
  });

  if (pendingSessionRequest) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a pending session request. Please wait for a tutor to accept or cancel it.'
    );
  }

  // Also check for pending trial request (can't have both)
  const pendingTrialRequest = await TrialRequest.findOne({
    studentId: new Types.ObjectId(studentId),
    status: TRIAL_REQUEST_STATUS.PENDING,
  });

  if (pendingTrialRequest) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have a pending trial request. Please wait for it to be accepted or cancel it first.'
    );
  }

  // Create session request
  const sessionRequest = await SessionRequest.create({
    ...payload,
    studentId: new Types.ObjectId(studentId),
    status: SESSION_REQUEST_STATUS.PENDING,
  });

  // Increment student session request count
  await User.findByIdAndUpdate(studentId, {
    $inc: { 'studentProfile.sessionRequestsCount': 1 },
  });

  // TODO: Send real-time notification to matching tutors
  // TODO: Send confirmation email to student

  return sessionRequest;
};

/**
 * Get matching session requests for tutor
 * Shows PENDING requests in tutor's subjects
 */
const getMatchingSessionRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  // Get tutor's subjects
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can view session requests');
  }

  const tutorSubjects = tutor.tutorProfile?.subjects || [];

  // Find matching requests
  const requestQuery = new QueryBuilder(
    SessionRequest.find({
      subject: { $in: tutorSubjects },
      status: SESSION_REQUEST_STATUS.PENDING,
      expiresAt: { $gt: new Date() }, // Not expired
    })
      .populate('studentId', 'name profilePicture studentProfile')
      .populate('subject', 'name icon'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get student's own session requests
 */
const getMySessionRequests = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const requestQuery = new QueryBuilder(
    SessionRequest.find({ studentId: new Types.ObjectId(studentId) })
      .populate('acceptedTutorId', 'name profilePicture')
      .populate('subject', 'name icon')
      .populate('chatId'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get all session requests (Admin)
 */
const getAllSessionRequests = async (query: Record<string, unknown>) => {
  const requestQuery = new QueryBuilder(
    SessionRequest.find()
      .populate('studentId', 'name email profilePicture studentProfile')
      .populate('acceptedTutorId', 'name email profilePicture')
      .populate('subject', 'name icon')
      .populate('chatId'),
    query
  )
    .search(['description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single session request
 */
const getSingleSessionRequest = async (id: string): Promise<ISessionRequest | null> => {
  const request = await SessionRequest.findById(id)
    .populate('studentId', 'name email profilePicture phone studentProfile')
    .populate('acceptedTutorId', 'name email profilePicture phone')
    .populate('subject', 'name icon description')
    .populate('chatId');

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  return request;
};

/**
 * Accept session request (Tutor)
 * Creates chat and connects student with tutor
 */
const acceptSessionRequest = async (
  requestId: string,
  tutorId: string
): Promise<ISessionRequest | null> => {
  // Verify request exists and is pending
  const request = await SessionRequest.findById(requestId).populate('subject', 'name');
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This session request is no longer available'
    );
  }

  // Check if expired
  if (new Date() > request.expiresAt) {
    request.status = SESSION_REQUEST_STATUS.EXPIRED;
    await request.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This session request has expired');
  }

  // Verify tutor
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
  }

  // Verify tutor teaches this subject (compare ObjectId)
  const tutorSubjectIds = tutor.tutorProfile?.subjects?.map(s => s.toString()) || [];
  if (!tutorSubjectIds.includes(request.subject.toString())) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You do not teach this subject'
    );
  }

  // Create chat between student and tutor
  const chat = await Chat.create({
    participants: [request.studentId, new Types.ObjectId(tutorId)],
    sessionRequestId: request._id, // Link chat to session request
  });

  // Update session request
  request.status = SESSION_REQUEST_STATUS.ACCEPTED;
  request.acceptedTutorId = new Types.ObjectId(tutorId);
  request.chatId = chat._id as Types.ObjectId;
  request.acceptedAt = new Date();
  await request.save();

  // TODO: Send real-time notification to student
  // TODO: Send email to student

  return request;
};

/**
 * Cancel session request (Student)
 */
const cancelSessionRequest = async (
  requestId: string,
  studentId: string,
  cancellationReason: string
): Promise<ISessionRequest | null> => {
  const request = await SessionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  // Verify ownership
  if (request.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own session requests'
    );
  }

  // Can only cancel PENDING requests
  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending session requests can be cancelled'
    );
  }

  // Update request
  request.status = SESSION_REQUEST_STATUS.CANCELLED;
  request.cancellationReason = cancellationReason;
  request.cancelledAt = new Date();
  await request.save();

  return request;
};

/**
 * Auto-expire session requests (Cron job)
 * Should be called periodically to expire old requests
 */
const expireOldRequests = async (): Promise<number> => {
  const result = await SessionRequest.updateMany(
    {
      status: SESSION_REQUEST_STATUS.PENDING,
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: SESSION_REQUEST_STATUS.EXPIRED },
    }
  );

  return result.modifiedCount;
};

export const SessionRequestService = {
  createSessionRequest,
  getMatchingSessionRequests,
  getMySessionRequests,
  getAllSessionRequests,
  getSingleSessionRequest,
  acceptSessionRequest,
  cancelSessionRequest,
  expireOldRequests,
};
