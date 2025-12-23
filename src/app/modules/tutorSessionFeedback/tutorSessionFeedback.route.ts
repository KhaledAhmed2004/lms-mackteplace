import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TutorSessionFeedbackController } from './tutorSessionFeedback.controller';
import { TutorSessionFeedbackValidation } from './tutorSessionFeedback.validation';

const router = express.Router();

// Tutor routes
router.post(
  '/',
  auth(USER_ROLES.TUTOR),
  validateRequest(TutorSessionFeedbackValidation.createFeedbackZodSchema as any),
  TutorSessionFeedbackController.submitFeedback
);

router.get(
  '/pending',
  auth(USER_ROLES.TUTOR),
  TutorSessionFeedbackController.getPendingFeedbacks
);

router.get(
  '/my-feedbacks',
  auth(USER_ROLES.TUTOR),
  TutorSessionFeedbackController.getTutorFeedbacks
);

// Student routes
router.get(
  '/received',
  auth(USER_ROLES.STUDENT),
  TutorSessionFeedbackController.getMyReceivedFeedbacks
);

// Shared routes (tutor or student can view feedback for their sessions)
router.get(
  '/session/:sessionId',
  auth(USER_ROLES.TUTOR, USER_ROLES.STUDENT),
  TutorSessionFeedbackController.getFeedbackBySession
);

export const TutorSessionFeedbackRoutes = router;
