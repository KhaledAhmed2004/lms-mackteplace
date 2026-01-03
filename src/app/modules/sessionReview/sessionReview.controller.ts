import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SessionReviewService } from './sessionReview.service';

/**
 * Create a new review
 */
const createReview = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await SessionReviewService.createReview(studentId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Review created successfully',
    data: result,
  });
});

/**
 * Get student's reviews
 */
const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await SessionReviewService.getMyReviews(studentId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reviews retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get tutor's reviews
 */
const getTutorReviews = catchAsync(async (req: Request, res: Response) => {
  const { tutorId } = req.params;
  const isAdmin = req.user?.role === 'SUPER_ADMIN';
  const result = await SessionReviewService.getTutorReviews(
    tutorId,
    req.query,
    isAdmin
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tutor reviews retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single review
 */
const getSingleReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SessionReviewService.getSingleReview(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review retrieved successfully',
    data: result,
  });
});

/**
 * Update review
 */
const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user!.id as string;
  const result = await SessionReviewService.updateReview(id, studentId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review updated successfully',
    data: result,
  });
});

/**
 * Delete review
 */
const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user!.id as string;
  await SessionReviewService.deleteReview(id, studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review deleted successfully',
    data: null,
  });
});

/**
 * Get tutor's review statistics
 */
const getTutorStats = catchAsync(async (req: Request, res: Response) => {
  const { tutorId } = req.params;
  const result = await SessionReviewService.getTutorStats(tutorId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tutor statistics retrieved successfully',
    data: result,
  });
});

/**
 * Toggle review visibility (Admin only)
 */
const toggleVisibility = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublic } = req.body;
  const result = await SessionReviewService.toggleVisibility(id, isPublic);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review visibility updated successfully',
    data: result,
  });
});

/**
 * Link orphaned reviews to sessions (Admin only - migration helper)
 */
const linkOrphanedReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionReviewService.linkOrphanedReviews();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `Linked ${result.linked} reviews, ${result.alreadyLinked} already linked`,
    data: result,
  });
});

export const SessionReviewController = {
  createReview,
  getMyReviews,
  getTutorReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getTutorStats,
  toggleVisibility,
  linkOrphanedReviews,
};
