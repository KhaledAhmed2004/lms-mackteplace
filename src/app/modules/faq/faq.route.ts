import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { FAQController } from './faq.controller';
import { FAQValidation } from './faq.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get all active FAQs sorted by order (for support page)
router.get('/active', FAQController.getActiveFAQs);

// Get all FAQs with filtering, searching, pagination
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  FAQController.getAllFAQs
);

// ============ ADMIN ONLY ROUTES ============

// Create new FAQ
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(FAQValidation.createFAQZodSchema),
  FAQController.createFAQ
);

// Update FAQ
router.patch(
  '/:faqId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(FAQValidation.updateFAQZodSchema),
  FAQController.updateFAQ
);

// Delete FAQ
router.delete(
  '/:faqId',
  auth(USER_ROLES.SUPER_ADMIN),
  FAQController.deleteFAQ
);

export const FAQRoutes = router;