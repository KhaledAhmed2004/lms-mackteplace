import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TrialRequestService } from './trialRequest.service';

/**
 * Create trial request (Student or Guest)
 * Can be used by:
 * - Logged-in students (auth token required)
 * - Guest users (no auth required, studentInfo must be complete)
 */
const createTrialRequest = catchAsync(async (req: Request, res: Response) => {
  // studentId will be null for guest users
  const studentId = req.user?.id || null;
  const result = await TrialRequestService.createTrialRequest(studentId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Trial request created successfully. Matching tutors will be notified.',
    data: result,
  });
});

/**
 * Get matching trial requests for tutor
 */
const getMatchingTrialRequests = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TrialRequestService.getMatchingTrialRequests(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Matching trial requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get student's own trial requests
 */
const getMyTrialRequests = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await TrialRequestService.getMyTrialRequests(studentId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your trial requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get all trial requests (Admin)
 */
const getAllTrialRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await TrialRequestService.getAllTrialRequests(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single trial request
 */
const getSingleTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TrialRequestService.getSingleTrialRequest(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request retrieved successfully',
    data: result,
  });
});

/**
 * Accept trial request (Tutor)
 */
const acceptTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tutorId = req.user!.id as string;
  const result = await TrialRequestService.acceptTrialRequest(id, tutorId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request accepted successfully. Chat created with student.',
    data: result,
  });
});

/**
 * Cancel trial request (Student)
 */
const cancelTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user!.id as string;
  const { cancellationReason } = req.body;

  const result = await TrialRequestService.cancelTrialRequest(
    id,
    studentId,
    cancellationReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request cancelled successfully',
    data: result,
  });
});

/**
 * Expire old trial requests (Cron job endpoint)
 */
const expireOldRequests = catchAsync(async (req: Request, res: Response) => {
  const count = await TrialRequestService.expireOldRequests();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} trial requests expired successfully`,
    data: { expiredCount: count },
  });
});

export const TrialRequestController = {
  createTrialRequest,
  getMatchingTrialRequests,
  getMyTrialRequests,
  getAllTrialRequests,
  getSingleTrialRequest,
  acceptTrialRequest,
  cancelTrialRequest,
  expireOldRequests,
};