import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';
import { Message } from '../message/message.model';
import { USER_ROLES } from '../../../enums/user';
import { ISession, SESSION_STATUS } from './session.interface';
import { Session } from './session.model';
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
  if (student.studentProfile?.subscriptionTier === 'REGULAR') {
    pricePerHour = 28;
  } else if (student.studentProfile?.subscriptionTier === 'LONG_TERM') {
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
  const meta = await sessionQuery.countTotal();

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

export const SessionService = {
  proposeSession,
  acceptSessionProposal,
  rejectSessionProposal,
  getAllSessions,
  getSingleSession,
  cancelSession,
  markAsCompleted,
  autoCompleteSessions,
};