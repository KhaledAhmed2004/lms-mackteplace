import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { InterviewSlotController } from './interviewSlot.controller';
import { InterviewSlotValidation } from './interviewSlot.validation';

const router = express.Router();

// ============ APPLICANT ROUTES ============
// Note: Only applicants with SELECTED_FOR_INTERVIEW status can access these

// Get my booked interview slot
router.get(
  '/my-interview',
  auth(USER_ROLES.APPLICANT),
  InterviewSlotController.getMyBookedInterview
);

// Get all scheduled meetings (BOOKED interview slots)
router.get(
  '/scheduled-meetings',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getScheduledMeetings
);

// Get Agora meeting token for interview video call
router.get(
  '/:id/meeting-token',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getMeetingToken
);

// Get available interview slots
router.get(
  '/',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getAllInterviewSlots
);

// Get single interview slot details
router.get(
  '/:id',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getSingleInterviewSlot
);

// Book an available interview slot
router.patch(
  '/:id/book',
  auth(USER_ROLES.APPLICANT),
  validateRequest(InterviewSlotValidation.bookInterviewSlotZodSchema),
  InterviewSlotController.bookInterviewSlot
);

// Cancel a booked interview slot
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.cancelInterviewSlotZodSchema),
  InterviewSlotController.cancelInterviewSlot
);

// Reschedule a booked interview to a different slot
router.patch(
  '/:id/reschedule',
  auth(USER_ROLES.APPLICANT),
  validateRequest(InterviewSlotValidation.rescheduleInterviewSlotZodSchema),
  InterviewSlotController.rescheduleInterviewSlot
);

// ============ ADMIN ROUTES ============

// Create new interview slot
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.createInterviewSlotZodSchema),
  InterviewSlotController.createInterviewSlot
);

// Mark interview as completed
router.patch(
  '/:id/complete',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.markAsCompleted
);

// Update interview slot (only AVAILABLE slots)
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.updateInterviewSlotZodSchema),
  InterviewSlotController.updateInterviewSlot
);

// Delete interview slot
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.deleteInterviewSlot
);

export const InterviewSlotRoutes = router;