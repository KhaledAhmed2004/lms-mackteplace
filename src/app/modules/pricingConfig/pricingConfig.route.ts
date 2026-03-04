import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PricingConfigController } from './pricingConfig.controller';
import { PricingConfigValidation } from './pricingConfig.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get active pricing plans (for homepage)
router.get('/plans', PricingConfigController.getActivePricingPlans);

// ============ ADMIN ROUTES ============

// Get full pricing config
router.get(
  '/config',
  auth(USER_ROLES.SUPER_ADMIN),
  PricingConfigController.getPricingConfig
);

// Update full pricing config
router.put(
  '/config',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingConfigValidation.updatePricingConfigZodSchema),
  PricingConfigController.updatePricingConfig
);

// Update single plan
router.patch(
  '/plans/:tier',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingConfigValidation.updateSinglePlanZodSchema),
  PricingConfigController.updateSinglePlan
);

// Reset to default pricing
router.post(
  '/reset',
  auth(USER_ROLES.SUPER_ADMIN),
  PricingConfigController.resetToDefaultPricing
);

export const PricingConfigRoutes = router;