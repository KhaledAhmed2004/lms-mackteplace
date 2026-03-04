import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { TutorSessionFeedbackController } from './tutorSessionFeedback.controller';
import { TutorSessionFeedbackValidation } from './tutorSessionFeedback.validation';

const router = express.Router();

// ============ ADMIN ROUTES (must be before parameterized routes) ============

// Get forfeited payments summary from missed feedback deadlines
router.get(
  '/admin/forfeited-summary',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorSessionFeedbackController.getForfeitedPaymentsSummary
);

// Get detailed list of forfeited feedbacks
router.get(
  '/admin/forfeited-list',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorSessionFeedbackController.getForfeitedFeedbacksList
);

// ============ TUTOR ROUTES ============

// Submit post-session feedback with optional audio attachment
router.post(
  '/',
  auth(USER_ROLES.TUTOR),
  fileHandler([{ name: 'feedbackAudioUrl', maxCount: 1 }]),
  validateRequest(TutorSessionFeedbackValidation.createFeedbackZodSchema as any),
  TutorSessionFeedbackController.submitFeedback
);

// Get sessions with pending feedback to submit
router.get(
  '/pending',
  auth(USER_ROLES.TUTOR),
  TutorSessionFeedbackController.getPendingFeedbacks
);

// Get all feedbacks submitted by the tutor
router.get(
  '/my-feedbacks',
  auth(USER_ROLES.TUTOR),
  TutorSessionFeedbackController.getTutorFeedbacks
);

// ============ STUDENT ROUTES ============

// Get all session feedbacks received by the student
router.get(
  '/received',
  auth(USER_ROLES.STUDENT),
  TutorSessionFeedbackController.getMyReceivedFeedbacks
);

// ============ SHARED ROUTES ============

// Get feedback for a specific session
router.get(
  '/session/:sessionId',
  auth(USER_ROLES.TUTOR, USER_ROLES.STUDENT),
  TutorSessionFeedbackController.getFeedbackBySession
);

export const TutorSessionFeedbackRoutes = router;
