import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { TrialRequestController } from './trialRequest.controller';
import { TrialRequestValidation } from './trialRequest.validation';

const router = express.Router();

// ============ PUBLIC / GUEST ROUTES ============

// Create trial request (guest or student)
router.post(
  '/',
  fileHandler([{ name: 'documents', maxCount: 3 }]),
  validateRequest(TrialRequestValidation.createTrialRequestZodSchema),
  TrialRequestController.createTrialRequest
);

// ============ STUDENT ROUTES ============

// NOTE: GET /my-requests removed - use /session-requests/my-requests instead (unified view)

// Cancel trial request
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(TrialRequestValidation.cancelTrialRequestZodSchema),
  TrialRequestController.cancelTrialRequest
);

// Extend trial request by 7 more days
router.patch(
  '/:id/extend',
  optionalAuth,
  TrialRequestController.extendTrialRequest
);

// ============ TUTOR ROUTES ============

// Get available trial requests matching tutor's subjects
router.get(
  '/available',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getAvailableTrialRequests
);

// Get trial requests the tutor has accepted
router.get(
  '/my-accepted',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getMyAcceptedTrialRequests
);

// Accept trial request (creates chat between student and tutor)
router.patch(
  '/:id/accept',
  auth(USER_ROLES.TUTOR),
  validateRequest(TrialRequestValidation.acceptTrialRequestZodSchema),
  TrialRequestController.acceptTrialRequest
);

// ============ SHARED ROUTES ============

// Get single trial request details
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TrialRequestController.getSingleTrialRequest
);

// ============ ADMIN ROUTES ============

// NOTE: GET / (all trial requests) removed - use /session-requests instead (unified view)

// Expire old trial requests (Cron job endpoint)
router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.expireOldRequests
);

// Send expiration reminder emails (Cron job endpoint)
router.post(
  '/send-reminders',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.sendExpirationReminders
);

// Auto-delete expired requests (Cron job endpoint)
router.post(
  '/auto-delete',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.autoDeleteExpiredRequests
);

export const TrialRequestRoutes = router;