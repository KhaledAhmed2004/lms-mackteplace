import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { SessionReview } from './sessionReview.model';
import { ISessionReview, IReviewStats } from './sessionReview.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import QueryBuilder from '../../builder/QueryBuilder';

/**
 * Create a new session review
 */
const createReview = async (
  studentId: string,
  payload: Partial<ISessionReview>
): Promise<ISessionReview> => {
  // Verify session exists and is completed
  const session = await Session.findById(payload.sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status !== SESSION_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Can only review completed sessions'
    );
  }

  // Verify student owns the session
  if (session.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only review your own sessions'
    );
  }

  // Check if review already exists
  const existingReview = await SessionReview.findOne({
    sessionId: payload.sessionId,
  });

  if (existingReview) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Review already exists for this session'
    );
  }

  // Create review
  const review = await SessionReview.create({
    ...payload,
    studentId: new Types.ObjectId(studentId),
    tutorId: session.tutorId,
  });

  return review;
};

/**
 * Get student's reviews
 */
const getMyReviews = async (studentId: string, query: Record<string, unknown>) => {
  const reviewQuery = new QueryBuilder(
    SessionReview.find({ studentId })
      .populate('sessionId', 'subject startTime endTime')
      .populate('tutorId', 'name email'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.countTotal();

  return { data: result, meta };
};

/**
 * Get tutor's reviews (public only or all for admin)
 */
const getTutorReviews = async (
  tutorId: string,
  query: Record<string, unknown>,
  isAdmin: boolean = false
) => {
  const baseQuery = isAdmin
    ? { tutorId }
    : { tutorId, isPublic: true };

  const reviewQuery = new QueryBuilder(
    SessionReview.find(baseQuery)
      .populate('studentId', 'name')
      .populate('sessionId', 'subject startTime'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.countTotal();

  return { data: result, meta };
};

/**
 * Get single review
 */
const getSingleReview = async (id: string): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id)
    .populate('studentId', 'name email')
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime endTime');

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  return review;
};

/**
 * Update review (only by student who created it)
 */
const updateReview = async (
  id: string,
  studentId: string,
  payload: Partial<ISessionReview>
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  // Verify ownership
  if (review.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only update your own reviews'
    );
  }

  // Update fields
  Object.assign(review, payload);
  review.isEdited = true;
  review.editedAt = new Date();

  await review.save();

  return review;
};

/**
 * Delete review (only by student who created it)
 */
const deleteReview = async (
  id: string,
  studentId: string
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  // Verify ownership
  if (review.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only delete your own reviews'
    );
  }

  await SessionReview.findByIdAndDelete(id);

  return review;
};

/**
 * Get tutor's review statistics
 */
const getTutorStats = async (tutorId: string): Promise<IReviewStats> => {
  const reviews = await SessionReview.find({ tutorId, isPublic: true });

  if (reviews.length === 0) {
    return {
      tutorId: new Types.ObjectId(tutorId),
      totalReviews: 0,
      averageOverallRating: 0,
      averageTeachingQuality: 0,
      averageCommunication: 0,
      averagePunctuality: 0,
      averagePreparedness: 0,
      wouldRecommendPercentage: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const totalReviews = reviews.length;

  // Calculate averages
  const averageOverallRating =
    reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews;
  const averageTeachingQuality =
    reviews.reduce((sum, r) => sum + r.teachingQuality, 0) / totalReviews;
  const averageCommunication =
    reviews.reduce((sum, r) => sum + r.communication, 0) / totalReviews;
  const averagePunctuality =
    reviews.reduce((sum, r) => sum + r.punctuality, 0) / totalReviews;
  const averagePreparedness =
    reviews.reduce((sum, r) => sum + r.preparedness, 0) / totalReviews;

  // Calculate recommendation percentage
  const wouldRecommendCount = reviews.filter(r => r.wouldRecommend).length;
  const wouldRecommendPercentage = (wouldRecommendCount / totalReviews) * 100;

  // Calculate rating distribution
  const ratingDistribution = reviews.reduce(
    (dist, r) => {
      const rating = Math.floor(r.overallRating) as 1 | 2 | 3 | 4 | 5;
      dist[rating]++;
      return dist;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );

  return {
    tutorId: new Types.ObjectId(tutorId),
    totalReviews,
    averageOverallRating: Math.round(averageOverallRating * 10) / 10,
    averageTeachingQuality: Math.round(averageTeachingQuality * 10) / 10,
    averageCommunication: Math.round(averageCommunication * 10) / 10,
    averagePunctuality: Math.round(averagePunctuality * 10) / 10,
    averagePreparedness: Math.round(averagePreparedness * 10) / 10,
    wouldRecommendPercentage: Math.round(wouldRecommendPercentage),
    ratingDistribution,
  };
};

/**
 * Toggle review visibility (Admin only)
 */
const toggleVisibility = async (
  id: string,
  isPublic: boolean
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  review.isPublic = isPublic;
  await review.save();

  return review;
};

export const SessionReviewService = {
  createReview,
  getMyReviews,
  getTutorReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getTutorStats,
  toggleVisibility,
};
