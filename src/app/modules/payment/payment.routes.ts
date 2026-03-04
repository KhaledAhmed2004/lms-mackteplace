import express from 'express';
import PaymentController from './payment.controller';
import WebhookController from './webhook.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { StripeConnectController } from './stripeConnect.controller';

const router = express.Router();

// ============ WEBHOOK ============

// Webhook routes (no authentication required)
// Note: Raw body parsing is handled at app level for webhook routes
router.post(
  '/webhook',
  WebhookController.handleStripeWebhook
);

// ============ STRIPE CONNECT (Tutor Onboarding) ============

// Stripe Connect account management
// APPLICANT can also create account when their application is APPROVED
router.post(
  '/stripe/account',
  auth(USER_ROLES.TUTOR, USER_ROLES.APPLICANT),
  StripeConnectController.createStripeAccountController
);

// Get Stripe Connect onboarding link
router.get(
  '/stripe/onboarding',
  auth(USER_ROLES.TUTOR, USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  StripeConnectController.getOnboardingLinkController
);

// Check Stripe Connect onboarding status
router.get(
  '/stripe/onboarding-status',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  StripeConnectController.checkOnboardingStatusController
);

// ============ PAYMENT HISTORY & RETRIEVAL ============

// Payment history route for poster, tasker, super admin
router.get(
  '/history',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  PaymentController.getPaymentHistoryController
);

// Retrieve current intent and client_secret by bidId
router.get(
  '/by-bid/:bidId/current-intent',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  PaymentController.getCurrentIntentByBidController
);

// Refund a payment
router.post(
  '/refund/:paymentId',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  PaymentController.refundPaymentController
);

// Payment information retrieval
router.get(
  '/:paymentId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  PaymentController.getPaymentByIdController
);

// ============ ADMIN ROUTES ============

// Get all payments (admin overview)
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  PaymentController.getPaymentsController
);

// Get payment statistics
router.get(
  '/stats',
  auth(USER_ROLES.SUPER_ADMIN),
  PaymentController.getPaymentStatsController
);

// Delete a Stripe Connect account
router.delete(
  '/account/:accountId',
  auth(USER_ROLES.SUPER_ADMIN),
  PaymentController.deleteStripeAccountController
);



export const PaymentRoutes = router;
