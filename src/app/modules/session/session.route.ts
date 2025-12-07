import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SessionController } from './session.controller';
import { SessionValidation } from './session.validation';

const router = express.Router();

// ============ TUTOR ROUTES ============

/**
 * @route   POST /api/v1/sessions/propose
 * @desc    Propose session in chat (In-chat booking)
 * @access  Tutor only (verified tutors)
 * @body    { chatId: string, subject: string, startTime: Date, endTime: Date, description?: string }
 * @note    Creates message with type: 'session_proposal'
 * @note    Price calculated based on student's subscription tier
 * @note    Proposal expires in 24 hours
 */
router.post(
  '/propose',
  auth(USER_ROLES.TUTOR),
  validateRequest(SessionValidation.proposeSessionZodSchema),
  SessionController.proposeSession
);

// ============ STUDENT ROUTES ============

/**
 * @route   POST /api/v1/sessions/proposals/:messageId/accept
 * @desc    Accept session proposal
 * @access  Student only
 * @note    Creates session with status: SCHEDULED
 * @note    Generates Google Meet link (placeholder)
 * @note    Updates proposal message status to ACCEPTED
 */
router.post(
  '/proposals/:messageId/accept',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionValidation.acceptSessionProposalZodSchema),
  SessionController.acceptSessionProposal
);

/**
 * @route   POST /api/v1/sessions/proposals/:messageId/reject
 * @desc    Reject session proposal
 * @access  Student only
 * @body    { rejectionReason: string }
 * @note    Updates proposal message status to REJECTED
 */
router.post(
  '/proposals/:messageId/reject',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionValidation.rejectSessionProposalZodSchema),
  SessionController.rejectSessionProposal
);

// ============ SHARED ROUTES (STUDENT + TUTOR + ADMIN) ============

/**
 * @route   GET /api/v1/sessions
 * @desc    Get sessions
 * @access  Student (own sessions), Tutor (own sessions), Admin (all sessions)
 * @query   ?status=SCHEDULED&page=1&limit=10&sort=-startTime
 */
router.get(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionController.getAllSessions
);

/**
 * @route   GET /api/v1/sessions/:id
 * @desc    Get single session details
 * @access  Student (own), Tutor (own), Admin (all)
 */
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionController.getSingleSession
);

/**
 * @route   PATCH /api/v1/sessions/:id/cancel
 * @desc    Cancel session
 * @access  Student or Tutor (must be participant)
 * @body    { cancellationReason: string }
 * @note    Only SCHEDULED sessions can be cancelled
 */
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.cancelSessionZodSchema),
  SessionController.cancelSession
);

// ============ ADMIN ROUTES ============

/**
 * @route   PATCH /api/v1/sessions/:id/complete
 * @desc    Manually mark session as completed
 * @access  Admin only
 * @note    Normally automated by cron job
 */
router.patch(
  '/:id/complete',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionValidation.completeSessionZodSchema),
  SessionController.markAsCompleted
);

/**
 * @route   POST /api/v1/sessions/auto-complete
 * @desc    Auto-complete sessions (Cron job endpoint)
 * @access  Admin only
 * @note    Marks sessions as COMPLETED after endTime passes
 * @note    Should be called periodically (e.g., every hour)
 */
router.post(
  '/auto-complete',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionController.autoCompleteSessions
);

export const SessionRoutes = router;