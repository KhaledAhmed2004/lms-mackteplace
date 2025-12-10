import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { InterviewSlotService } from './interviewSlot.service';

/**
 * Create interview slot (Admin only)
 */
const createInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const result = await InterviewSlotService.createInterviewSlot(adminId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Interview slot created successfully',
    data: result,
  });
});

/**
 * Get all interview slots
 * Admin: See all slots
 * Applicant: See only available slots
 */
const getAllInterviewSlots = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const result = await InterviewSlotService.getAllInterviewSlots(req.query, userId, userRole);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slots retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single interview slot
 */
const getSingleInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.getSingleInterviewSlot(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot retrieved successfully',
    data: result,
  });
});

/**
 * Book interview slot (Applicant)
 */
const bookInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const applicantId = req.user?.id;
  const { applicationId } = req.body;

  const result = await InterviewSlotService.bookInterviewSlot(
    id,
    applicantId,
    applicationId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot booked successfully',
    data: result,
  });
});

/**
 * Cancel interview slot
 */
const cancelInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { cancellationReason } = req.body;

  const result = await InterviewSlotService.cancelInterviewSlot(
    id,
    userId,
    cancellationReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot cancelled successfully',
    data: result,
  });
});

/**
 * Mark interview as completed (Admin only)
 */
const markAsCompleted = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.markAsCompleted(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview marked as completed successfully',
    data: result,
  });
});

/**
 * Update interview slot (Admin only)
 */
const updateInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.updateInterviewSlot(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot updated successfully',
    data: result,
  });
});

/**
 * Delete interview slot (Admin only)
 */
const deleteInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.deleteInterviewSlot(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot deleted successfully',
    data: result,
  });
});

export const InterviewSlotController = {
  createInterviewSlot,
  getAllInterviewSlots,
  getSingleInterviewSlot,
  bookInterviewSlot,
  cancelInterviewSlot,
  markAsCompleted,
  updateInterviewSlot,
  deleteInterviewSlot,
};