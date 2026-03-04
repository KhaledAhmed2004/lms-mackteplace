import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SessionReviewController } from './sessionReview.controller';
import { SessionReviewValidation } from './sessionReview.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

// Create a new review for a completed session
router.post(
  '/',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionReviewValidation.createReviewZodSchema),
  SessionReviewController.createReview
);

// Get student's own reviews
router.get(
  '/my-reviews',
  auth(USER_ROLES.STUDENT),
  SessionReviewController.getMyReviews
);

// Update own review
router.patch(
  '/:id',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionReviewValidation.updateReviewZodSchema),
  SessionReviewController.updateReview
);

// Delete own review
router.delete(
  '/:id',
  auth(USER_ROLES.STUDENT),
  SessionReviewController.deleteReview
);

// ============ PUBLIC/TUTOR ROUTES ============

// Get tutor's reviews (public only, or all if admin)
router.get(
  '/tutor/:tutorId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getTutorReviews
);

// Get tutor's review statistics
router.get(
  '/tutor/:tutorId/stats',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getTutorStats
);

// Get review for a specific session
router.get(
  '/session/:sessionId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getReviewBySession
);

// Get single review details
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getSingleReview
);

// ============ ADMIN ROUTES ============

// Toggle review visibility (hide/show publicly)
router.patch(
  '/:id/visibility',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.toggleVisibility
);

// Link orphaned reviews to sessions (migration helper)
router.post(
  '/link-orphaned',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.linkOrphanedReviews
);

// Admin: Create a review for a tutor (without session requirement)
router.post(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionReviewValidation.adminCreateReviewZodSchema),
  SessionReviewController.adminCreateReview
);

// Admin: Update any review
router.patch(
  '/admin/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionReviewValidation.adminUpdateReviewZodSchema),
  SessionReviewController.adminUpdateReview
);

// Admin: Delete any review
router.delete(
  '/admin/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.adminDeleteReview
);

export const SessionReviewRoutes = router;