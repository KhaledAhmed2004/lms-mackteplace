import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { GradeController } from './grade.controller';
import { GradeValidation } from './grade.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get all active grades (for students/tutors to see available grades)
router.get('/active', GradeController.getActiveGrades);

// Get single grade by ID
router.get('/:gradeId', GradeController.getSingleGrade);

// Get all grades with filtering, searching, pagination
router.get('/', GradeController.getAllGrades);

// ============ ADMIN ONLY ROUTES ============

// Create new grade
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradeValidation.createGradeZodSchema),
  GradeController.createGrade
);

// Update grade
router.patch(
  '/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradeValidation.updateGradeZodSchema),
  GradeController.updateGrade
);

// Delete grade (soft delete - sets isActive to false)
router.delete(
  '/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  GradeController.deleteGrade
);

export const GradeRoutes = router;