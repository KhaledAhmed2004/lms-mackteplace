import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TutorEarningsController } from './tutorEarnings.controller';
import { TutorEarningsValidation } from './tutorEarnings.validation';

const router = express.Router();

// ============ TUTOR ROUTES ============

// Get tutor's comprehensive stats including level progress
router.get(
  '/my-stats',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getMyStats
);

// Get tutor's earnings history
router.get(
  '/my-earnings',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getMyEarnings
);

// Get tutor's formatted earnings history for frontend
router.get(
  '/history',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getEarningsHistory
);

// Get tutor's payout settings (IBAN, recipient)
router.get(
  '/payout-settings',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getPayoutSettings
);

// Update tutor's payout settings
router.patch(
  '/payout-settings',
  auth(USER_ROLES.TUTOR),
  validateRequest(TutorEarningsValidation.updatePayoutSettingsZodSchema),
  TutorEarningsController.updatePayoutSettings
);

// Get single earnings record
router.get(
  '/:id',
  auth(USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.getSingleEarning
);

// ============ ADMIN ROUTES ============

// Generate tutor earnings for all tutors (cron job, month-end)
router.post(
  '/generate',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.generateTutorEarningsZodSchema),
  TutorEarningsController.generateTutorEarnings
);

// Get all earnings
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.getAllEarnings
);

// Initiate Stripe Connect payout to tutor
router.patch(
  '/:id/initiate-payout',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.initiatePayoutZodSchema),
  TutorEarningsController.initiatePayout
);

// Mark payout as paid
router.patch(
  '/:id/mark-paid',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.markAsPaid
);

// Mark payout as failed
router.patch(
  '/:id/mark-failed',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.markAsFailedZodSchema),
  TutorEarningsController.markAsFailed
);

export const TutorEarningsRoutes = router;