import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';
import { Message } from '../message/message.model';
import { USER_ROLES } from '../../../enums/user';
import { ISession, SESSION_STATUS, RESCHEDULE_STATUS } from './session.interface';
import { Session } from './session.model';
import { TutorSessionFeedbackService } from '../tutorSessionFeedback/tutorSessionFeedback.service';
import { UserService } from '../user/user.service';
// import { generateGoogleMeetLink } from '../../../helpers/googleMeetHelper'; // Phase 8

/**
 * Propose session (Tutor sends proposal in chat)
 * Creates a message with type: 'session_proposal'
 */
const proposeSession = async (
  tutorId: string,
  payload: {
    chatId: string;
    subject: string;
    startTime: string;
    endTime: string;
    description?: string;
  }
) => {
  // Verify tutor
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can propose sessions');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can propose sessions');
  }

  // Verify chat exists and tutor is participant
  const chat = await Chat.findById(payload.chatId);
  if (!chat) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }

  const isTutorParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === tutorId
  );
  if (!isTutorParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  // Get student from chat
  const studentId = chat.participants.find(
    (p: Types.ObjectId) => p.toString() !== tutorId
  );
  if (!studentId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No student found in chat');
  }

  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  // Calculate duration
  const startTime = new Date(payload.startTime);
  const endTime = new Date(payload.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  // Get price based on student's subscription tier
  let pricePerHour = 30; // Default: Flexible
  if (student.studentProfile?.currentPlan === 'REGULAR') {
    pricePerHour = 28;
  } else if (student.studentProfile?.currentPlan === 'LONG_TERM') {
    pricePerHour = 25;
  }

  const totalPrice = (pricePerHour * duration) / 60;

  // Create session proposal message
  const message = await Message.create({
    chatId: new Types.ObjectId(payload.chatId),
    sender: new Types.ObjectId(tutorId),
    type: 'session_proposal',
    text: `Session proposal: ${payload.subject}`,
    sessionProposal: {
      subject: payload.subject,
      startTime,
      endTime,
      duration,
      price: totalPrice,
      description: payload.description,
      status: 'PROPOSED',
    },
  });

  // TODO: Send real-time notification to student
  // io.to(studentId.toString()).emit('sessionProposal', {
  //   tutorName: tutor.name,
  //   subject: payload.subject,
  //   startTime,
  //   totalPrice,
  //   messageId: message._id
  // });

  return message;
};

/**
 * Accept session proposal (Student accepts)
 * Creates actual session and Google Meet link
 */
const acceptSessionProposal = async (
  messageId: string,
  studentId: string
) => {
  // Get proposal message
  const message = await Message.findById(messageId).populate('chatId');
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (message.type !== 'session_proposal' || !message.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  // Verify student is participant
  const chat = message.chatId as any;
  const isStudentParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === studentId
  );
  if (!isStudentParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  // Check if proposal is still valid
  if (message.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`
    );
  }

  // Check if expired
  if (new Date() > message.sessionProposal.expiresAt) {
    message.sessionProposal.status = 'EXPIRED';
    await message.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposal has expired');
  }

  // Get tutor ID (sender of proposal)
  const tutorId = message.sender;

  // Create session
  const session = await Session.create({
    studentId: new Types.ObjectId(studentId),
    tutorId,
    subject: message.sessionProposal.subject,
    description: message.sessionProposal.description,
    startTime: message.sessionProposal.startTime,
    endTime: message.sessionProposal.endTime,
    duration: message.sessionProposal.duration,
    pricePerHour: message.sessionProposal.price / (message.sessionProposal.duration / 60),
    totalPrice: message.sessionProposal.price,
    status: SESSION_STATUS.SCHEDULED,
    messageId: message._id as Types.ObjectId,
    chatId: message.chatId as Types.ObjectId,
  });

  // TODO: Generate Google Meet link
  // session.googleMeetLink = await generateGoogleMeetLink({
  //   summary: `Tutoring Session: ${session.subject}`,
  //   description: session.description,
  //   startTime: session.startTime,
  //   endTime: session.endTime,
  //   attendees: [student.email, tutor.email]
  // });
  // await session.save();

  // Update proposal message
  message.sessionProposal.status = 'ACCEPTED';
  message.sessionProposal.sessionId = session._id as Types.ObjectId;
  await message.save();

  // TODO: Send notifications
  // io.to(tutorId.toString()).emit('sessionAccepted', {
  //   studentName: student.name,
  //   sessionId: session._id,
  //   meetLink: session.googleMeetLink
  // });

  return session;
};

/**
 * Reject session proposal (Student rejects)
 */
const rejectSessionProposal = async (
  messageId: string,
  studentId: string,
  rejectionReason: string
) => {
  const message = await Message.findById(messageId).populate('chatId');
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (message.type !== 'session_proposal' || !message.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  // Verify student is participant
  const chat = message.chatId as any;
  const isStudentParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === studentId
  );
  if (!isStudentParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  // Check if proposal can be rejected
  if (message.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`
    );
  }

  // Update proposal
  message.sessionProposal.status = 'REJECTED';
  message.sessionProposal.rejectionReason = rejectionReason;
  await message.save();

  // TODO: Notify tutor
  // io.to(message.sender.toString()).emit('sessionRejected', {
  //   rejectionReason
  // });

  return message;
};

/**
 * Get all sessions with filtering
 */
const getAllSessions = async (
  query: Record<string, unknown>,
  userId?: string,
  userRole?: string
) => {
  let filter = {};

  // Filter based on role
  if (userRole === USER_ROLES.STUDENT) {
    filter = { studentId: new Types.ObjectId(userId) };
  } else if (userRole === USER_ROLES.TUTOR) {
    filter = { tutorId: new Types.ObjectId(userId) };
  }
  // SUPER_ADMIN sees all

  const sessionQuery = new QueryBuilder(
    Session.find(filter)
      .populate('studentId', 'name email profilePicture')
      .populate('tutorId', 'name email profilePicture'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await sessionQuery.modelQuery;
  const meta = await sessionQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single session
 */
const getSingleSession = async (id: string): Promise<ISession | null> => {
  const session = await Session.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('tutorId', 'name email profilePicture phone')
    .populate('chatId')
    .populate('messageId')
    .populate('reviewId');

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  return session;
};

/**
 * Cancel session (Student or Tutor)
 */
const cancelSession = async (
  sessionId: string,
  userId: string,
  cancellationReason: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is student or tutor
  if (
    session.studentId.toString() !== userId &&
    session.tutorId.toString() !== userId
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this session'
    );
  }

  // Can only cancel SCHEDULED sessions
  if (session.status !== SESSION_STATUS.SCHEDULED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel session with status: ${session.status}`
    );
  }

  // Update session
  session.status = SESSION_STATUS.CANCELLED;
  session.cancellationReason = cancellationReason;
  session.cancelledBy = new Types.ObjectId(userId);
  session.cancelledAt = new Date();
  await session.save();

  // TODO: Send notifications
  // TODO: Cancel Google Calendar event

  return session;
};

/**
 * Mark session as completed (Manual - for testing, cron job automates this)
 */
const markAsCompleted = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session is already completed');
  }

  // Update session
  session.status = SESSION_STATUS.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  // TODO: Send review request email to student

  return session;
};

/**
 * Auto-complete sessions (Cron job)
 * Marks sessions as COMPLETED after endTime passes
 */
const autoCompleteSessions = async (): Promise<number> => {
  const result = await Session.updateMany(
    {
      status: SESSION_STATUS.SCHEDULED,
      endTime: { $lt: new Date() },
    },
    {
      $set: {
        status: SESSION_STATUS.COMPLETED,
        completedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

/**
 * Get upcoming sessions for user
 * Includes: SCHEDULED, STARTING_SOON, IN_PROGRESS, AWAITING_RESPONSE, RESCHEDULE_REQUESTED
 */
const getUpcomingSessions = async (
  userId: string,
  userRole: string,
  query: Record<string, unknown>
) => {
  const now = new Date();
  const filterField = userRole === USER_ROLES.STUDENT ? 'studentId' : 'tutorId';

  const sessionQuery = new QueryBuilder(
    Session.find({
      [filterField]: new Types.ObjectId(userId),
      status: {
        $in: [
          SESSION_STATUS.SCHEDULED,
          SESSION_STATUS.STARTING_SOON,
          SESSION_STATUS.IN_PROGRESS,
          SESSION_STATUS.AWAITING_RESPONSE,
          SESSION_STATUS.RESCHEDULE_REQUESTED,
        ],
      },
      startTime: { $gte: now },
    })
      .populate('studentId', 'name email profilePicture')
      .populate('tutorId', 'name email profilePicture averageRating')
      .populate('reviewId')
      .populate('tutorFeedbackId'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const result = await sessionQuery.modelQuery;
  const meta = await sessionQuery.getPaginationInfo();

  return { data: result, meta };
};

/**
 * Get completed sessions for user
 * Includes: COMPLETED, CANCELLED, EXPIRED, NO_SHOW
 * Also includes review status information
 */
const getCompletedSessions = async (
  userId: string,
  userRole: string,
  query: Record<string, unknown>
) => {
  const filterField = userRole === USER_ROLES.STUDENT ? 'studentId' : 'tutorId';

  const sessionQuery = new QueryBuilder(
    Session.find({
      [filterField]: new Types.ObjectId(userId),
      status: {
        $in: [
          SESSION_STATUS.COMPLETED,
          SESSION_STATUS.CANCELLED,
          SESSION_STATUS.EXPIRED,
          SESSION_STATUS.NO_SHOW,
        ],
      },
    })
      .populate('studentId', 'name email profilePicture')
      .populate('tutorId', 'name email profilePicture averageRating')
      .populate('reviewId')
      .populate('tutorFeedbackId'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const result = await sessionQuery.modelQuery;
  const meta = await sessionQuery.getPaginationInfo();

  // Add review status flags
  const sessionsWithReviewStatus = result.map((session: any) => {
    const sessionObj = session.toObject();
    return {
      ...sessionObj,
      studentReviewStatus: session.reviewId ? 'COMPLETED' : 'PENDING',
      tutorFeedbackStatus: session.tutorFeedbackId ? 'COMPLETED' : 'PENDING',
    };
  });

  return { data: sessionsWithReviewStatus, meta };
};

/**
 * Request session reschedule
 * Can be requested by student or tutor up to 10 minutes before start
 */
const requestReschedule = async (
  sessionId: string,
  userId: string,
  payload: {
    newStartTime: string;
    reason?: string;
  }
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is student or tutor
  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reschedule this session'
    );
  }

  // Check if session can be rescheduled
  if (
    session.status !== SESSION_STATUS.SCHEDULED &&
    session.status !== SESSION_STATUS.STARTING_SOON
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot reschedule session with status: ${session.status}`
    );
  }

  // Check if already has pending reschedule request
  if (
    session.rescheduleRequest &&
    session.rescheduleRequest.status === RESCHEDULE_STATUS.PENDING
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This session already has a pending reschedule request'
    );
  }

  // Check if within 10 minutes of start
  const now = new Date();
  const tenMinutesBefore = new Date(session.startTime.getTime() - 10 * 60 * 1000);

  if (now >= tenMinutesBefore) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reschedule within 10 minutes of session start'
    );
  }

  // Calculate new end time (maintain same duration)
  const newStartTime = new Date(payload.newStartTime);
  const newEndTime = new Date(newStartTime.getTime() + session.duration * 60 * 1000);

  // Validate new time is in future
  if (newStartTime <= now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New start time must be in the future');
  }

  // Store previous times
  session.previousStartTime = session.startTime;
  session.previousEndTime = session.endTime;

  // Create reschedule request
  session.rescheduleRequest = {
    requestedBy: new Types.ObjectId(userId),
    requestedAt: now,
    newStartTime,
    newEndTime,
    reason: payload.reason,
    status: RESCHEDULE_STATUS.PENDING,
  };

  session.status = SESSION_STATUS.RESCHEDULE_REQUESTED;
  await session.save();

  // TODO: Send notification to other party
  // const otherPartyId = isStudent ? session.tutorId : session.studentId;
  // io.to(otherPartyId.toString()).emit('rescheduleRequested', {...});

  return session;
};

/**
 * Approve reschedule request
 */
const approveReschedule = async (
  sessionId: string,
  userId: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is the OTHER party (not the one who requested)
  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to approve this reschedule'
    );
  }

  if (!session.rescheduleRequest) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No reschedule request found');
  }

  if (session.rescheduleRequest.status !== RESCHEDULE_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`
    );
  }

  // Verify approver is NOT the requester
  if (session.rescheduleRequest.requestedBy.toString() === userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot approve your own reschedule request'
    );
  }

  // Update session times
  session.startTime = session.rescheduleRequest.newStartTime;
  session.endTime = session.rescheduleRequest.newEndTime;

  // Update reschedule request
  session.rescheduleRequest.status = RESCHEDULE_STATUS.APPROVED;
  session.rescheduleRequest.respondedAt = new Date();
  session.rescheduleRequest.respondedBy = new Types.ObjectId(userId);

  // Reset status to SCHEDULED
  session.status = SESSION_STATUS.SCHEDULED;

  await session.save();

  // TODO: Update Google Calendar event
  // TODO: Send notification to requester

  return session;
};

/**
 * Reject reschedule request
 */
const rejectReschedule = async (
  sessionId: string,
  userId: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is the OTHER party
  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reject this reschedule'
    );
  }

  if (!session.rescheduleRequest) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No reschedule request found');
  }

  if (session.rescheduleRequest.status !== RESCHEDULE_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`
    );
  }

  // Verify rejector is NOT the requester
  if (session.rescheduleRequest.requestedBy.toString() === userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot reject your own reschedule request'
    );
  }

  // Update reschedule request
  session.rescheduleRequest.status = RESCHEDULE_STATUS.REJECTED;
  session.rescheduleRequest.respondedAt = new Date();
  session.rescheduleRequest.respondedBy = new Types.ObjectId(userId);

  // Reset status to SCHEDULED (keep original times)
  session.status = SESSION_STATUS.SCHEDULED;

  await session.save();

  // TODO: Send notification to requester

  return session;
};

/**
 * Session status auto-transitions (Cron job)
 * SCHEDULED -> STARTING_SOON (10 min before)
 * STARTING_SOON -> IN_PROGRESS (at start time)
 * IN_PROGRESS -> EXPIRED (at end time if not completed)
 */
const autoTransitionSessionStatuses = async (): Promise<{
  startingSoon: number;
  inProgress: number;
  expired: number;
}> => {
  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

  // SCHEDULED -> STARTING_SOON (10 minutes before start)
  const startingSoonResult = await Session.updateMany(
    {
      status: SESSION_STATUS.SCHEDULED,
      startTime: { $lte: tenMinutesFromNow, $gt: now },
    },
    { $set: { status: SESSION_STATUS.STARTING_SOON } }
  );

  // STARTING_SOON/SCHEDULED -> IN_PROGRESS (at start time)
  const inProgressResult = await Session.updateMany(
    {
      status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON] },
      startTime: { $lte: now },
      endTime: { $gt: now },
    },
    {
      $set: {
        status: SESSION_STATUS.IN_PROGRESS,
        startedAt: now,
      },
    }
  );

  // IN_PROGRESS -> EXPIRED (at end time if not manually completed)
  const expiredResult = await Session.updateMany(
    {
      status: SESSION_STATUS.IN_PROGRESS,
      endTime: { $lte: now },
    },
    {
      $set: {
        status: SESSION_STATUS.EXPIRED,
        expiredAt: now,
      },
    }
  );

  return {
    startingSoon: startingSoonResult.modifiedCount,
    inProgress: inProgressResult.modifiedCount,
    expired: expiredResult.modifiedCount,
  };
};

/**
 * Mark session as completed (Enhanced - with tutor feedback creation)
 */
const markAsCompletedEnhanced = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session is already completed');
  }

  // Update session
  session.status = SESSION_STATUS.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  // Create pending tutor feedback record
  try {
    await TutorSessionFeedbackService.createPendingFeedback(
      sessionId,
      session.tutorId.toString(),
      session.studentId.toString(),
      session.completedAt
    );
  } catch {
    // Feedback creation failed, but session is still completed
    // Log error but don't fail the completion
  }

  // Update tutor level after session completion
  try {
    await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
  } catch {
    // Level update failed, but session is still completed
    // Log error but don't fail the completion
  }

  // TODO: Send review request email to student
  // TODO: Send feedback reminder to tutor

  return session;
};

export const SessionService = {
  proposeSession,
  acceptSessionProposal,
  rejectSessionProposal,
  getAllSessions,
  getSingleSession,
  cancelSession,
  markAsCompleted,
  autoCompleteSessions,
  getUpcomingSessions,
  getCompletedSessions,
  requestReschedule,
  approveReschedule,
  rejectReschedule,
  autoTransitionSessionStatuses,
  markAsCompletedEnhanced,
};