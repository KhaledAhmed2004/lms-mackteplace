import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SessionService } from './session.service';

/**
 * Propose session (Tutor sends in chat)
 */
const proposeSession = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user?.id;
  const result = await SessionService.proposeSession(tutorId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Session proposal sent successfully',
    data: result,
  });
});

/**
 * Accept session proposal (Student accepts)
 */
const acceptSessionProposal = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const studentId = req.user?.id;
  const result = await SessionService.acceptSessionProposal(messageId, studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Session booked successfully. Google Meet link will be generated.',
    data: result,
  });
});

/**
 * Reject session proposal (Student rejects)
 */
const rejectSessionProposal = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const studentId = req.user?.id;
  const { rejectionReason } = req.body;

  const result = await SessionService.rejectSessionProposal(
    messageId,
    studentId,
    rejectionReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session proposal rejected',
    data: result,
  });
});

/**
 * Get all sessions
 * Student: Own sessions
 * Tutor: Own sessions
 * Admin: All sessions
 */
const getAllSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const result = await SessionService.getAllSessions(req.query, userId, userRole);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Sessions retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single session
 */
const getSingleSession = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SessionService.getSingleSession(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session retrieved successfully',
    data: result,
  });
});

/**
 * Cancel session (Student or Tutor)
 */
const cancelSession = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { cancellationReason } = req.body;

  const result = await SessionService.cancelSession(id, userId, cancellationReason);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session cancelled successfully',
    data: result,
  });
});

/**
 * Mark session as completed (Admin/Manual)
 */
const markAsCompleted = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SessionService.markAsCompleted(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session marked as completed',
    data: result,
  });
});

/**
 * Auto-complete sessions (Cron job endpoint)
 */
const autoCompleteSessions = catchAsync(async (req: Request, res: Response) => {
  const count = await SessionService.autoCompleteSessions();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} sessions auto-completed successfully`,
    data: { completedCount: count },
  });
});

export const SessionController = {
  proposeSession,
  acceptSessionProposal,
  rejectSessionProposal,
  getAllSessions,
  getSingleSession,
  cancelSession,
  markAsCompleted,
  autoCompleteSessions,
};