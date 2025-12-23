import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import { User } from '../user/user.model';
import { TutorSessionFeedback } from './tutorSessionFeedback.model';
import {
  ITutorSessionFeedback,
  FEEDBACK_STATUS,
  FEEDBACK_TYPE,
} from './tutorSessionFeedback.interface';
import QueryBuilder from '../../builder/QueryBuilder';

// Helper to calculate due date (3rd of next month)
const calculateDueDate = (sessionDate: Date): Date => {
  const dueDate = new Date(sessionDate);
  dueDate.setMonth(dueDate.getMonth() + 1);
  dueDate.setDate(3);
  dueDate.setHours(23, 59, 59, 999); // End of day
  return dueDate;
};

// Create feedback record when session is completed
const createPendingFeedback = async (
  sessionId: string,
  tutorId: string,
  studentId: string,
  sessionCompletedAt: Date
): Promise<ITutorSessionFeedback> => {
  // Check if feedback already exists
  const existingFeedback = await TutorSessionFeedback.findOne({ sessionId });
  if (existingFeedback) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Feedback record already exists for this session'
    );
  }

  const dueDate = calculateDueDate(sessionCompletedAt);

  const feedback = await TutorSessionFeedback.create({
    sessionId,
    tutorId,
    studentId,
    dueDate,
    status: FEEDBACK_STATUS.PENDING,
    rating: 0, // Will be set when tutor submits
    feedbackType: FEEDBACK_TYPE.TEXT, // Default, will be set when tutor submits
  });

  // Increment tutor's pending feedback count
  await User.findByIdAndUpdate(tutorId, {
    $inc: { 'tutorProfile.pendingFeedbackCount': 1 },
  });

  return feedback;
};

// Submit feedback (tutor action)
const submitFeedback = async (
  tutorId: string,
  payload: {
    sessionId: string;
    rating: number;
    feedbackType: FEEDBACK_TYPE;
    feedbackText?: string;
    feedbackAudioUrl?: string;
    audioDuration?: number;
  }
): Promise<ITutorSessionFeedback> => {
  const { sessionId, rating, feedbackType, feedbackText, feedbackAudioUrl, audioDuration } =
    payload;

  // Verify session exists and is completed
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status !== SESSION_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Can only submit feedback for completed sessions'
    );
  }

  // Verify tutor owns this session
  if (session.tutorId.toString() !== tutorId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only submit feedback for your own sessions'
    );
  }

  // Check if feedback already exists
  let feedback = await TutorSessionFeedback.findOne({ sessionId });

  const now = new Date();
  const dueDate = feedback?.dueDate || calculateDueDate(session.completedAt || now);
  const isLate = now > dueDate;

  if (feedback) {
    // Update existing feedback record
    if (feedback.status === FEEDBACK_STATUS.SUBMITTED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Feedback already submitted');
    }

    feedback.rating = rating;
    feedback.feedbackType = feedbackType;
    feedback.feedbackText = feedbackText;
    feedback.feedbackAudioUrl = feedbackAudioUrl;
    feedback.audioDuration = audioDuration;
    feedback.submittedAt = now;
    feedback.isLate = isLate;
    feedback.status = FEEDBACK_STATUS.SUBMITTED;

    await feedback.save();
  } else {
    // Create new feedback record
    feedback = await TutorSessionFeedback.create({
      sessionId,
      tutorId,
      studentId: session.studentId,
      rating,
      feedbackType,
      feedbackText,
      feedbackAudioUrl,
      audioDuration,
      dueDate,
      submittedAt: now,
      isLate,
      status: FEEDBACK_STATUS.SUBMITTED,
    });
  }

  // Update session with feedback reference
  await Session.findByIdAndUpdate(sessionId, {
    tutorFeedbackId: feedback._id,
  });

  // Decrement tutor's pending feedback count
  await User.findByIdAndUpdate(tutorId, {
    $inc: { 'tutorProfile.pendingFeedbackCount': -1 },
  });

  // Update tutor's average rating
  await updateTutorRating(tutorId);

  return feedback;
};

// Update tutor's average rating based on their feedback ratings
const updateTutorRating = async (tutorId: string): Promise<void> => {
  const result = await TutorSessionFeedback.aggregate([
    {
      $match: {
        tutorId: new Types.ObjectId(tutorId),
        status: FEEDBACK_STATUS.SUBMITTED,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await User.findByIdAndUpdate(tutorId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      ratingsCount: result[0].count,
    });
  }
};

// Get pending feedbacks for a tutor
const getPendingFeedbacks = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      tutorId: new Types.ObjectId(tutorId),
      status: FEEDBACK_STATUS.PENDING,
    })
      .populate('sessionId', 'subject startTime endTime studentId')
      .populate('studentId', 'name email profilePicture'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

// Get all feedbacks for a tutor (submitted)
const getTutorFeedbacks = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      tutorId: new Types.ObjectId(tutorId),
      status: FEEDBACK_STATUS.SUBMITTED,
    })
      .populate('sessionId', 'subject startTime endTime')
      .populate('studentId', 'name email profilePicture'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

// Get feedback for a specific session
const getFeedbackBySession = async (
  sessionId: string,
  userId: string
): Promise<ITutorSessionFeedback | null> => {
  const feedback = await TutorSessionFeedback.findOne({ sessionId })
    .populate('sessionId', 'subject startTime endTime tutorId studentId')
    .populate('studentId', 'name email profilePicture')
    .populate('tutorId', 'name email profilePicture');

  if (!feedback) {
    return null;
  }

  // Verify user is either the tutor or student of this session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const isAuthorized =
    session.tutorId.toString() === userId || session.studentId.toString() === userId;

  if (!isAuthorized) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to view this feedback');
  }

  return feedback;
};

// Get feedbacks received by a student
const getStudentFeedbacks = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      studentId: new Types.ObjectId(studentId),
      status: FEEDBACK_STATUS.SUBMITTED,
    })
      .populate('sessionId', 'subject startTime endTime')
      .populate('tutorId', 'name email profilePicture'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

// Get feedbacks due soon (for reminder cron job)
const getFeedbacksDueSoon = async (
  daysUntilDue: number
): Promise<ITutorSessionFeedback[]> => {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysUntilDue);

  return TutorSessionFeedback.find({
    status: FEEDBACK_STATUS.PENDING,
    dueDate: { $lte: targetDate },
  })
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime')
    .populate('studentId', 'name');
};

// Get overdue feedbacks
const getOverdueFeedbacks = async (): Promise<ITutorSessionFeedback[]> => {
  const now = new Date();

  return TutorSessionFeedback.find({
    status: FEEDBACK_STATUS.PENDING,
    dueDate: { $lt: now },
  })
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime')
    .populate('studentId', 'name');
};

export const TutorSessionFeedbackService = {
  createPendingFeedback,
  submitFeedback,
  updateTutorRating,
  getPendingFeedbacks,
  getTutorFeedbacks,
  getFeedbackBySession,
  getStudentFeedbacks,
  getFeedbacksDueSoon,
  getOverdueFeedbacks,
};
