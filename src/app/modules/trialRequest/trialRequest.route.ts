import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
import validateRequest from '../../middlewares/validateRequest';
import { TrialRequestController } from './trialRequest.controller';
import { TrialRequestValidation } from './trialRequest.validation';

const router = express.Router();

// ============ PUBLIC / GUEST ROUTES ============

/**
 * @route   POST /api/v1/trial-requests
 * @desc    Create trial request (Uber-style request)
 * @access  Public (Guest or Student)
 * @body    {
 *   studentInfo: { firstName, lastName, email, isUnder18, dateOfBirth? },
 *   subject: ObjectId (Subject ID),
 *   gradeLevel: GRADE_LEVEL enum,
 *   schoolType: SCHOOL_TYPE enum,
 *   description: string,
 *   preferredLanguage: 'ENGLISH' | 'GERMAN',
 *   learningGoals?: string,
 *   documents?: string[],
 *   guardianInfo?: { name, email, phone, relationship? } (Required if under 18),
 *   preferredDateTime?: Date
 * }
 * @note    Guest users can create requests without authentication
 * @note    Student can only have one pending request at a time (checked by studentId or email)
 * @note    Request expires after 24 hours
 * @note    Guardian info required for students under 18
 */
router.post(
  '/',
  optionalAuth, // Allow both authenticated and guest users
  validateRequest(TrialRequestValidation.createTrialRequestZodSchema),
  TrialRequestController.createTrialRequest
);

// ============ STUDENT ROUTES ============

/**
 * @route   GET /api/v1/trial-requests/my-requests
 * @desc    Get student's own trial requests
 * @access  Student only
 * @query   ?status=PENDING&page=1&limit=10
 */
router.get(
  '/my-requests',
  auth(USER_ROLES.STUDENT),
  TrialRequestController.getMyTrialRequests
);

/**
 * @route   PATCH /api/v1/trial-requests/:id/cancel
 * @desc    Cancel trial request
 * @access  Student only (must own the request)
 * @body    { cancellationReason: string }
 * @note    Only PENDING requests can be cancelled
 */
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(TrialRequestValidation.cancelTrialRequestZodSchema),
  TrialRequestController.cancelTrialRequest
);

// ============ TUTOR ROUTES ============

/**
 * @route   GET /api/v1/trial-requests/matching
 * @desc    Get trial requests matching tutor's subjects
 * @access  Tutor only (verified tutors only)
 * @query   ?subject=Math&page=1&limit=10
 * @note    Only shows PENDING requests in tutor's teaching subjects
 * @note    Excludes expired requests
 */
router.get(
  '/matching',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getMatchingTrialRequests
);

/**
 * @route   PATCH /api/v1/trial-requests/:id/accept
 * @desc    Accept trial request (Uber-style accept)
 * @access  Tutor only (verified tutors only)
 * @note    Creates chat between student and tutor
 * @note    Changes request status to ACCEPTED
 * @note    Tutor must teach the requested subject
 * @note    Sends notification to student
 */
router.patch(
  '/:id/accept',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.acceptTrialRequest
);

// ============ SHARED ROUTES ============

/**
 * @route   GET /api/v1/trial-requests/:id
 * @desc    Get single trial request details
 * @access  Student (own requests), Tutor (matching requests), Admin (all)
 */
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TrialRequestController.getSingleTrialRequest
);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/v1/trial-requests
 * @desc    Get all trial requests
 * @access  Admin only
 * @query   ?status=PENDING&subject=Math&searchTerm=help&page=1&limit=10
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.getAllTrialRequests
);

/**
 * @route   POST /api/v1/trial-requests/expire-old
 * @desc    Expire old trial requests (Cron job endpoint)
 * @access  Admin only
 * @note    Updates PENDING requests past expiresAt to EXPIRED
 * @note    Should be called periodically (e.g., every hour)
 */
router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.expireOldRequests
);

export const TrialRequestRoutes = router;