import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TutorApplicationController } from './tutorApplication.controller';
import { TutorApplicationValidation } from './tutorApplication.validation';

const router = express.Router();

/**
 * @route   POST /api/v1/applications
 * @desc    Submit tutor application (PUBLIC - creates user + application)
 * @access  Public (no auth required)
 * @body    {
 *   email, password,
 *   name, birthDate, phone,
 *   street, houseNumber, zipCode, city,
 *   subjects[],
 *   cv, abiturCertificate, officialIdDocument
 * }
 * @note    First-time registration for tutors
 */
router.post(
  '/',
  validateRequest(TutorApplicationValidation.createApplicationZodSchema),
  TutorApplicationController.submitApplication
);

/**
 * @route   GET /api/v1/applications/my-application
 * @desc    Get my application status
 * @access  Applicant only
 */
router.get(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  TutorApplicationController.getMyApplication
);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/v1/applications
 * @desc    Get all applications with filtering, searching, pagination
 * @access  Admin only
 * @query   ?page=1&limit=10&searchTerm=john&status=SUBMITTED
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getAllApplications
);

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single application by ID
 * @access  Admin only
 */
router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getSingleApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/approve
 * @desc    Approve application (changes user role to TUTOR)
 * @access  Admin only
 * @body    { adminNotes?: string }
 */
router.patch(
  '/:id/approve',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.approveApplicationZodSchema),
  TutorApplicationController.approveApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/reject
 * @desc    Reject application
 * @access  Admin only
 * @body    { rejectionReason: string }
 */
router.patch(
  '/:id/reject',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.rejectApplicationZodSchema),
  TutorApplicationController.rejectApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/revision
 * @desc    Send application for revision (ask applicant to fix something)
 * @access  Admin only
 * @body    { revisionNote: string }
 */
router.patch(
  '/:id/revision',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.sendForRevisionZodSchema),
  TutorApplicationController.sendForRevision
);

/**
 * @route   PATCH /api/v1/applications/:id
 * @desc    Update application status (generic update)
 * @access  Admin only
 * @body    { status?, rejectionReason?, revisionNote?, adminNotes? }
 */
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.updateApplicationStatusZodSchema),
  TutorApplicationController.updateApplicationStatus
);

/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete application (hard delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.deleteApplication
);

export const TutorApplicationRoutes = router;
