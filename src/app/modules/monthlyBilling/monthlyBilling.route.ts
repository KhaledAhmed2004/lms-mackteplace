import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { MonthlyBillingController } from './monthlyBilling.controller';
import { MonthlyBillingValidation } from './monthlyBilling.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

// Get student's billing history
router.get(
  '/my-billings',
  auth(USER_ROLES.STUDENT),
  MonthlyBillingController.getMyBillings
);

// Get single billing details
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.getSingleBilling
);

// ============ ADMIN ROUTES ============

// Generate monthly billings for all students (cron job, month-end)
router.post(
  '/generate',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(MonthlyBillingValidation.generateMonthlyBillingZodSchema),
  MonthlyBillingController.generateMonthlyBillings
);

// Get all billings
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.getAllBillings
);

// Mark billing as paid
router.patch(
  '/:id/mark-paid',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.markAsPaid
);

// Mark billing as failed
router.patch(
  '/:id/mark-failed',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.markAsFailed
);

export const MonthlyBillingRoutes = router;