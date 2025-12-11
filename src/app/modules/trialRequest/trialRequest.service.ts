import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Chat } from '../chat/chat.model';
import { Subject } from '../subject/subject.model';
import { ITrialRequest, TRIAL_REQUEST_STATUS } from './trialRequest.interface';
import { TrialRequest } from './trialRequest.model';
import { SessionRequest } from '../sessionRequest/sessionRequest.model';
import { SESSION_REQUEST_STATUS } from '../sessionRequest/sessionRequest.interface';

/**
 * Create trial request (First-time Student or Guest ONLY)
 * For returning students, use SessionRequest module instead
 */
const createTrialRequest = async (
  studentId: string | null,
  payload: Partial<ITrialRequest>
): Promise<ITrialRequest> => {
  // Validate subject exists
  const subjectExists = await Subject.findById(payload.subject);
  if (!subjectExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  // Validate based on age
  // Under 18: guardian info required
  // 18+: student email/password required
  if (payload.studentInfo?.isUnder18) {
    if (!payload.studentInfo?.guardianInfo) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Guardian information is required for students under 18'
      );
    }
  } else {
    if (!payload.studentInfo?.email) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Email is required for students 18 and above'
      );
    }
    if (!payload.studentInfo?.password) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Password is required for students 18 and above'
      );
    }
  }

  // If logged-in student, verify and check eligibility
  if (studentId) {
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

    // Returning students should use SessionRequest, not TrialRequest
    if (student.studentProfile?.hasCompletedTrial) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have already completed a trial. Please use the session request feature for additional tutoring sessions.'
      );
    }

    // Check if student has pending trial request
    const pendingTrialRequest = await TrialRequest.findOne({
      studentId: new Types.ObjectId(studentId),
      status: TRIAL_REQUEST_STATUS.PENDING,
    });

    if (pendingTrialRequest) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You already have a pending trial request. Please wait for a tutor to accept or cancel it.'
      );
    }

    // Also check for pending session request
    const pendingSessionRequest = await SessionRequest.findOne({
      studentId: new Types.ObjectId(studentId),
      status: SESSION_REQUEST_STATUS.PENDING,
    });

    if (pendingSessionRequest) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have a pending session request. Please wait for it to be accepted or cancel it first.'
      );
    }
  } else {
    // Guest user - check by email for previous trials and pending requests
    const emailToCheck = payload.studentInfo?.isUnder18
      ? payload.studentInfo?.guardianInfo?.email
      : payload.studentInfo?.email;

    if (emailToCheck) {
      // Check if guest has already completed a trial
      const previousAcceptedTrial = await TrialRequest.findOne({
        $or: [
          { 'studentInfo.email': emailToCheck },
          { 'studentInfo.guardianInfo.email': emailToCheck },
        ],
        status: TRIAL_REQUEST_STATUS.ACCEPTED,
      });

      if (previousAcceptedTrial) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You have already completed a trial with this email. Please log in to request more sessions.'
        );
      }

      // Check for pending requests
      const pendingRequest = await TrialRequest.findOne({
        $or: [
          { 'studentInfo.email': emailToCheck },
          { 'studentInfo.guardianInfo.email': emailToCheck },
        ],
        status: TRIAL_REQUEST_STATUS.PENDING,
      });

      if (pendingRequest) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'A pending trial request already exists for this email. Please wait for a tutor to accept or cancel it.'
        );
      }
    }
  }

  // Create trial request
  const trialRequest = await TrialRequest.create({
    ...payload,
    studentId: studentId ? new Types.ObjectId(studentId) : undefined,
    status: TRIAL_REQUEST_STATUS.PENDING,
  });

  // Increment student trial request count if logged in
  if (studentId) {
    await User.findByIdAndUpdate(studentId, {
      $inc: { 'studentProfile.trialRequestsCount': 1 },
    });
  }

  // TODO: Send real-time notification to matching tutors
  // TODO: Send email notification to admin
  // TODO: Send confirmation email to student

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
    })
      .populate('studentId', 'name profilePicture')
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
 * Get student's own trial requests
 */
const getMyTrialRequests = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const requestQuery = new QueryBuilder(
    TrialRequest.find({ studentId: new Types.ObjectId(studentId) })
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
 * Get all trial requests (Admin)
 */
const getAllTrialRequests = async (query: Record<string, unknown>) => {
  const requestQuery = new QueryBuilder(
    TrialRequest.find()
      .populate('studentId', 'name email profilePicture')
      .populate('acceptedTutorId', 'name email profilePicture')
      .populate('subject', 'name icon')
      .populate('chatId'),
    query
  )
    .search(['description', 'studentInfo.name', 'studentInfo.email'])
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
 * Get single trial request
 */
const getSingleTrialRequest = async (id: string): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('acceptedTutorId', 'name email profilePicture phone')
    .populate('subject', 'name icon description')
    .populate('chatId');

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  return request;
};

/**
 * Accept trial request (Tutor)
 * Creates chat and connects student with tutor
 * Marks student as having completed trial
 */
const acceptTrialRequest = async (
  requestId: string,
  tutorId: string
): Promise<ITrialRequest | null> => {
  // Verify request exists and is pending
  const request = await TrialRequest.findById(requestId).populate('subject', 'name');
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

  // Verify tutor teaches this subject (compare ObjectId)
  const tutorSubjectIds = tutor.tutorProfile?.subjects?.map(s => s.toString()) || [];
  if (!tutorSubjectIds.includes(request.subject.toString())) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You do not teach this subject'
    );
  }

  // Prepare chat participants
  // If studentId exists (logged-in user), use it; otherwise, create chat with tutor only for now
  const chatParticipants = request.studentId
    ? [request.studentId, new Types.ObjectId(tutorId)]
    : [new Types.ObjectId(tutorId)];

  // Create chat between student and tutor
  const chat = await Chat.create({
    participants: chatParticipants,
    trialRequestId: request._id, // Link chat to trial request
  });

  // Update trial request
  request.status = TRIAL_REQUEST_STATUS.ACCEPTED;
  request.acceptedTutorId = new Types.ObjectId(tutorId);
  request.chatId = chat._id as Types.ObjectId;
  request.acceptedAt = new Date();
  await request.save();

  // Mark student as having completed trial (so they use SessionRequest next time)
  if (request.studentId) {
    await User.findByIdAndUpdate(request.studentId, {
      $set: { 'studentProfile.hasCompletedTrial': true },
    });
  }

  // TODO: Send real-time notification to student
  // TODO: Send email to student

  return request;
};

/**
 * Cancel trial request (Student)
 * Can be cancelled by studentId (logged-in) or by email (guest)
 */
const cancelTrialRequest = async (
  requestId: string,
  studentIdOrEmail: string,
  cancellationReason: string
): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  // Verify ownership - check both studentId and studentInfo.email
  const isOwnerByStudentId =
    request.studentId && request.studentId.toString() === studentIdOrEmail;
  const isOwnerByEmail =
    request.studentInfo?.email?.toLowerCase() === studentIdOrEmail.toLowerCase();

  if (!isOwnerByStudentId && !isOwnerByEmail) {
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
