import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SubjectController } from './subject.controller';
import { SubjectValidation } from './subject.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get all active subjects (for students/tutors to see available subjects)
router.get('/active', SubjectController.getActiveSubjects);

// Get single subject by ID
router.get('/:subjectId', SubjectController.getSingleSubject);

// Get all subjects with filtering, searching, pagination
router.get('/', SubjectController.getAllSubjects);

// ============ ADMIN ONLY ROUTES ============

// Create new subject
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SubjectValidation.createSubjectZodSchema),
  SubjectController.createSubject
);

// Update subject
router.patch(
  '/:subjectId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SubjectValidation.updateSubjectZodSchema),
  SubjectController.updateSubject
);

// Delete subject (blocked if active requests exist)
router.delete(
  '/:subjectId',
  auth(USER_ROLES.SUPER_ADMIN),
  SubjectController.deleteSubject
);

export const SubjectRoutes = router;