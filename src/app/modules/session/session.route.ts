import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SessionController } from './session.controller';
import { SessionValidation } from './session.validation';

const router = express.Router();

// ============ TUTOR ROUTES ============

// Propose session in chat (In-chat booking)
router.post(
  '/propose',
  auth(USER_ROLES.TUTOR),
  validateRequest(SessionValidation.proposeSessionZodSchema),
  SessionController.proposeSession
);

// ============ PROPOSAL RESPONSE ROUTES (Student or Tutor) ============

// Accept session proposal
router.post(
  '/proposals/:messageId/accept',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.acceptSessionProposalZodSchema),
  SessionController.acceptSessionProposal
);

// Counter-propose session with alternative time
router.post(
  '/proposals/:messageId/counter',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionValidation.counterProposeSessionZodSchema),
  SessionController.counterProposeSession
);

// Reject session proposal
router.post(
  '/proposals/:messageId/reject',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.rejectSessionProposalZodSchema),
  SessionController.rejectSessionProposal
);

// ============ SHARED ROUTES (STUDENT + TUTOR + ADMIN) ============

// Get upcoming sessions for logged-in user
router.get(
  '/my-upcoming',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.getUpcomingSessions
);

// Get completed sessions for logged-in user
router.get(
  '/my-completed',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.getCompletedSessions
);

// Get sessions
router.get(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionController.getAllSessions
);

// Get single session details
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionController.getSingleSession
);

// Cancel session
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.cancelSessionZodSchema),
  SessionController.cancelSession
);

// Request session reschedule
router.patch(
  '/:id/reschedule',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.rescheduleSessionZodSchema),
  SessionController.requestReschedule
);

// Approve reschedule request
router.patch(
  '/:id/approve-reschedule',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.approveReschedule
);

// Reject reschedule request
router.patch(
  '/:id/reject-reschedule',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.rejectReschedule
);

// ============ ADMIN ROUTES ============

// Manually mark session as completed
router.patch(
  '/:id/complete',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionValidation.completeSessionZodSchema),
  SessionController.markAsCompleted
);

// Auto-complete sessions (Cron job endpoint)
router.post(
  '/auto-complete',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionController.autoCompleteSessions
);

// Auto-transition session statuses (Cron job endpoint)
router.post(
  '/auto-transition',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionController.autoTransitionStatuses
);

export const SessionRoutes = router;