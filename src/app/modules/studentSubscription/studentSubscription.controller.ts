import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StudentSubscriptionService } from './studentSubscription.service';

/**
 * Subscribe to a plan (Student)
 */
const subscribeToPlan = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const { tier } = req.body;
  const result = await StudentSubscriptionService.subscribeToPlan(studentId, tier);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Subscription created successfully',
    data: result,
  });
});

/**
 * Get student's active subscription
 */
const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await StudentSubscriptionService.getMySubscription(studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subscription retrieved successfully',
    data: result,
  });
});

/**
 * Get all subscriptions (Admin)
 */
const getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentSubscriptionService.getAllSubscriptions(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subscriptions retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single subscription
 */
const getSingleSubscription = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await StudentSubscriptionService.getSingleSubscription(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subscription retrieved successfully',
    data: result,
  });
});

/**
 * Cancel subscription (Student)
 */
const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user!.id as string;
  const { cancellationReason } = req.body;

  const result = await StudentSubscriptionService.cancelSubscription(
    id,
    studentId,
    cancellationReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subscription cancelled successfully',
    data: result,
  });
});

/**
 * Expire old subscriptions (Cron job endpoint)
 */
const expireOldSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const count = await StudentSubscriptionService.expireOldSubscriptions();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} subscriptions expired successfully`,
    data: { expiredCount: count },
  });
});

/**
 * Get plan usage details (Student)
 * Includes: plan details, usage stats, spending, upcoming sessions
 */
const getMyPlanUsage = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await StudentSubscriptionService.getMyPlanUsage(studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Plan usage retrieved successfully',
    data: result,
  });
});

export const StudentSubscriptionController = {
  subscribeToPlan,
  getMySubscription,
  getAllSubscriptions,
  getSingleSubscription,
  cancelSubscription,
  expireOldSubscriptions,
  getMyPlanUsage,
};
