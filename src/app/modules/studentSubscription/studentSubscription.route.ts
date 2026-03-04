import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { StudentSubscriptionController } from './studentSubscription.controller';
import { StudentSubscriptionValidation } from './studentSubscription.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

// Subscribe to a pricing plan
router.post(
  '/subscribe',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.subscribeToPlanZodSchema),
  StudentSubscriptionController.subscribeToPlan
);

// Get student's active subscription
router.get(
  '/my-subscription',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getMySubscription
);

// Get comprehensive plan usage details
router.get(
  '/my-plan-usage',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getMyPlanUsage
);

// Cancel subscription
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.cancelSubscriptionZodSchema),
  StudentSubscriptionController.cancelSubscription
);

// Create Stripe PaymentIntent for subscription
router.post(
  '/create-payment-intent',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.subscribeToPlanZodSchema),
  StudentSubscriptionController.createPaymentIntent
);

// Confirm payment and activate subscription
router.post(
  '/confirm-payment',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.confirmPaymentZodSchema),
  StudentSubscriptionController.confirmPayment
);

// Get payment history
router.get(
  '/payment-history',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getPaymentHistory
);

// ============ ADMIN ROUTES ============

// Get all subscriptions
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.getAllSubscriptions
);

// Get single subscription details
router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.getSingleSubscription
);

// Expire old subscriptions (Cron job endpoint)
router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.expireOldSubscriptions
);

export const StudentSubscriptionRoutes = router;