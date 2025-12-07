import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { StudentSubscriptionController } from './studentSubscription.controller';
import { StudentSubscriptionValidation } from './studentSubscription.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

/**
 * @route   POST /api/v1/subscriptions/subscribe
 * @desc    Subscribe to a pricing plan
 * @access  Student only
 * @body    { tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' }
 * @note    FLEXIBLE: €30/hr, no commitment
 * @note    REGULAR: €28/hr, 1 month, min 4 hours
 * @note    LONG_TERM: €25/hr, 3 months, min 4 hours
 * @note    Student can only have one active subscription
 */
router.post(
  '/subscribe',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.subscribeToPlanZodSchema),
  StudentSubscriptionController.subscribeToPlan
);

/**
 * @route   GET /api/v1/subscriptions/my-subscription
 * @desc    Get student's active subscription
 * @access  Student only
 */
router.get(
  '/my-subscription',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getMySubscription
);

/**
 * @route   PATCH /api/v1/subscriptions/:id/cancel
 * @desc    Cancel subscription
 * @access  Student only (must own subscription)
 * @body    { cancellationReason: string }
 */
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.cancelSubscriptionZodSchema),
  StudentSubscriptionController.cancelSubscription
);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all subscriptions
 * @access  Admin only
 * @query   ?status=ACTIVE&tier=REGULAR&page=1&limit=10
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.getAllSubscriptions
);

/**
 * @route   GET /api/v1/subscriptions/:id
 * @desc    Get single subscription details
 * @access  Admin only
 */
router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.getSingleSubscription
);

/**
 * @route   POST /api/v1/subscriptions/expire-old
 * @desc    Expire old subscriptions (Cron job endpoint)
 * @access  Admin only
 * @note    Marks subscriptions as EXPIRED after endDate passes
 * @note    Should be called periodically (e.g., daily)
 */
router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.expireOldSubscriptions
);

export const StudentSubscriptionRoutes = router;
