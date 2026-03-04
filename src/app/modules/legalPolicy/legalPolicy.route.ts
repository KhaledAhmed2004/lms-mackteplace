import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { LegalPolicyController } from './legalPolicy.controller';
import { LegalPolicyValidation } from './legalPolicy.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get all active policies (for public display)
router.get('/public', LegalPolicyController.getAllActivePolicies);

// Get active policy by type (for public display)
router.get(
  '/public/:type',
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.getActivePolicyByType
);

// ============ ADMIN ONLY ROUTES ============

// Get all policies (admin)
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  LegalPolicyController.getAllPolicies
);

// Get policy by type (admin)
router.get(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.getPolicyByType
);

// Create or update policy (upsert)
router.put(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  validateRequest(LegalPolicyValidation.upsertPolicyZodSchema),
  LegalPolicyController.upsertPolicy
);

// Update policy
router.patch(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  validateRequest(LegalPolicyValidation.updatePolicyZodSchema),
  LegalPolicyController.updatePolicy
);

// Delete policy (soft delete)
router.delete(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.deletePolicy
);

// Initialize default policies
router.post(
  '/initialize',
  auth(USER_ROLES.SUPER_ADMIN),
  LegalPolicyController.initializeDefaultPolicies
);

export const LegalPolicyRoutes = router;