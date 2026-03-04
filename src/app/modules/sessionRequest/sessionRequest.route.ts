import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { SessionRequestController } from './sessionRequest.controller';
import { SessionRequestValidation } from './sessionRequest.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

// Create a new session request
router.post(
  '/',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionRequestValidation.createSessionRequestZodSchema),
  SessionRequestController.createSessionRequest
);

// Get all session requests created by the student
router.get(
  '/my-requests',
  auth(USER_ROLES.STUDENT),
  SessionRequestController.getMySessionRequests
);

// Cancel a pending session request
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionRequestValidation.cancelSessionRequestZodSchema),
  SessionRequestController.cancelSessionRequest
);

// Extend session request expiry time
router.patch(
  '/:id/extend',
  auth(USER_ROLES.STUDENT),
  SessionRequestController.extendSessionRequest
);

// ============ TUTOR ROUTES ============

// Get session requests matching the tutor's subjects
router.get(
  '/matching',
  auth(USER_ROLES.TUTOR),
  SessionRequestController.getMatchingSessionRequests
);

// Get session requests accepted by the tutor
router.get(
  '/my-accepted',
  auth(USER_ROLES.TUTOR),
  SessionRequestController.getMyAcceptedRequests
);

// Accept a session request and open chat with student
router.patch(
  '/:id/accept',
  auth(USER_ROLES.TUTOR),
  validateRequest(SessionRequestValidation.acceptSessionRequestZodSchema),
  SessionRequestController.acceptSessionRequest
);

// ============ ADMIN ROUTES ============

// Get all session requests (admin overview)
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.getAllSessionRequests
);

// Expire old pending requests past their expiry date
router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.expireOldRequests
);

// Send expiration reminder notifications
router.post(
  '/send-reminders',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.sendExpirationReminders
);

// Auto-delete expired requests after reminder period
router.post(
  '/auto-delete',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.autoDeleteExpiredRequests
);

// ============ SHARED ROUTES ============

// Get single session request details
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionRequestController.getSingleSessionRequest
);

export const SessionRequestRoutes = router;
