import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SchoolTypeController } from './schoolType.controller';
import { SchoolTypeValidation } from './schoolType.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get all active school types (for students/tutors to see available school types)
router.get('/active', SchoolTypeController.getActiveSchoolTypes);

// Get single school type by ID
router.get('/:schoolTypeId', SchoolTypeController.getSingleSchoolType);

// Get all school types with filtering, searching, pagination
router.get('/', SchoolTypeController.getAllSchoolTypes);

// ============ ADMIN ONLY ROUTES ============

// Create new school type
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SchoolTypeValidation.createSchoolTypeZodSchema),
  SchoolTypeController.createSchoolType
);

// Update school type
router.patch(
  '/:schoolTypeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SchoolTypeValidation.updateSchoolTypeZodSchema),
  SchoolTypeController.updateSchoolType
);

// Delete school type (soft delete - sets isActive to false)
router.delete(
  '/:schoolTypeId',
  auth(USER_ROLES.SUPER_ADMIN),
  SchoolTypeController.deleteSchoolType
);

export const SchoolTypeRoutes = router;