import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TutorApplicationController } from './tutorApplication.controller';
import { TutorApplicationValidation } from './tutorApplication.validation';

const router = express.Router();

/**
 * @route   POST /api/v1/applications
 * @desc    Submit tutor application
 * @access  Any authenticated user
 * @body    { subjects[], name, email, phone, address, birthDate, cvUrl, abiturCertificateUrl, educationProofUrls[]? }
 * @note    Files must be uploaded first via file upload endpoint
 * @note    User role will be changed to APPLICANT after submission
 */
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.APPLICANT), // Any user can apply
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
 * @query   ?page=1&limit=10&searchTerm=john&status=SUBMITTED&phase=1
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
 * @route   PATCH /api/v1/applications/:id/approve-phase2
 * @desc    Approve application to Phase 2 (Interview scheduling)
 * @access  Admin only
 * @body    { adminNotes?: string }
 * @note    Sends email to applicant with interview scheduling link
 */
router.patch(
  '/:id/approve-phase2',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.approveToPhase2ZodSchema),
  TutorApplicationController.approveToPhase2
);

/**
 * @route   PATCH /api/v1/applications/:id/reject
 * @desc    Reject application
 * @access  Admin only
 * @body    { rejectionReason: string }
 * @note    Sends rejection email to applicant
 */
router.patch(
  '/:id/reject',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.rejectApplicationZodSchema),
  TutorApplicationController.rejectApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/mark-as-tutor
 * @desc    Mark applicant as tutor (Final approval - Phase 3)
 * @access  Admin only
 * @note    Changes user role from APPLICANT to TUTOR
 * @note    Sends welcome email to new tutor
 */
router.patch(
  '/:id/mark-as-tutor',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.markAsTutor
);

/**
 * @route   PATCH /api/v1/applications/:id
 * @desc    Update application status (generic update)
 * @access  Admin only
 * @body    { status?, rejectionReason?, adminNotes? }
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
