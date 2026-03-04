import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentMethodController } from './paymentMethod.controller';
import { PaymentMethodValidation } from './paymentMethod.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

// Get all saved payment methods
router.get(
  '/',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.getPaymentMethods
);

// Create SetupIntent for adding new payment method
router.post(
  '/setup-intent',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.createSetupIntent
);

// Attach payment method after successful setup
router.post(
  '/attach',
  auth(USER_ROLES.STUDENT),
  validateRequest(PaymentMethodValidation.attachPaymentMethodZodSchema),
  PaymentMethodController.attachPaymentMethod
);

// Set a payment method as default
router.patch(
  '/:paymentMethodId/default',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.setDefaultPaymentMethod
);

// Delete a payment method
router.delete(
  '/:paymentMethodId',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.deletePaymentMethod
);

export const PaymentMethodRoutes = router;