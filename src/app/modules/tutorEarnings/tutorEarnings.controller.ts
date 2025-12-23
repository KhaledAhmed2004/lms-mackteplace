import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TutorEarningsService } from './tutorEarnings.service';

/**
 * Generate tutor earnings (Cron job or manual trigger)
 */
const generateTutorEarnings = catchAsync(async (req: Request, res: Response) => {
  const { month, year, commissionRate } = req.body;
  const result = await TutorEarningsService.generateTutorEarnings(
    month,
    year,
    commissionRate
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: `${result.length} tutor earnings generated successfully`,
    data: { count: result.length, earnings: result },
  });
});

/**
 * Get tutor's earnings history
 */
const getMyEarnings = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TutorEarningsService.getMyEarnings(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Earnings history retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get all earnings (Admin)
 */
const getAllEarnings = catchAsync(async (req: Request, res: Response) => {
  const result = await TutorEarningsService.getAllEarnings(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Earnings retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single earnings record
 */
const getSingleEarning = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TutorEarningsService.getSingleEarning(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Earnings record retrieved successfully',
    data: result,
  });
});

/**
 * Initiate payout to tutor (Stripe Connect transfer)
 */
const initiatePayout = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TutorEarningsService.initiatePayout(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout initiated successfully',
    data: result,
  });
});

/**
 * Mark payout as paid (Manual or webhook)
 */
const markAsPaid = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TutorEarningsService.markAsPaid(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout marked as paid',
    data: result,
  });
});

/**
 * Mark payout as failed
 */
const markAsFailed = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { failureReason } = req.body;
  const result = await TutorEarningsService.markAsFailed(id, failureReason);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout marked as failed',
    data: result,
  });
});

export const TutorEarningsController = {
  generateTutorEarnings,
  getMyEarnings,
  getAllEarnings,
  getSingleEarning,
  initiatePayout,
  markAsPaid,
  markAsFailed,
};
