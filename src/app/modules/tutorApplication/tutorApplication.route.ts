import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import validateRequest from '../../middlewares/validateRequest';
import { TutorApplicationController } from './tutorApplication.controller';
import { TutorApplicationValidation } from './tutorApplication.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Submit tutor application (creates user + application)
router.post(
  '/',
  fileHandler([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
  ]),
  validateRequest(TutorApplicationValidation.createApplicationZodSchema),
  TutorApplicationController.submitApplication
);

// ============ APPLICANT ROUTES ============

// Get my application status
router.get(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  TutorApplicationController.getMyApplication
);

// Update my application (when in REVISION status)
router.patch(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  fileHandler([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
  ]),
  validateRequest(TutorApplicationValidation.updateMyApplicationZodSchema),
  TutorApplicationController.updateMyApplication
);

// ============ ADMIN ROUTES ============

// Get all applications with filtering, searching, pagination
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getAllApplications
);

// Get single application by ID
router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getSingleApplication
);

// Select application for interview (after initial review)
router.patch(
  '/:id/select-for-interview',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.selectForInterviewZodSchema),
  TutorApplicationController.selectForInterview
);

// Approve application after interview (changes user role to TUTOR)
router.patch(
  '/:id/approve',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.approveApplicationZodSchema),
  TutorApplicationController.approveApplication
);

// Reject application
router.patch(
  '/:id/reject',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.rejectApplicationZodSchema),
  TutorApplicationController.rejectApplication
);

// Send application for revision (ask applicant to fix something)
router.patch(
  '/:id/revision',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.sendForRevisionZodSchema),
  TutorApplicationController.sendForRevision
);

// Delete application (hard delete)
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.deleteApplication
);

export const TutorApplicationRoutes = router;