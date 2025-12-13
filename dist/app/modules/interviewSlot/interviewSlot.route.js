"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewSlotRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const interviewSlot_controller_1 = require("./interviewSlot.controller");
const interviewSlot_validation_1 = require("./interviewSlot.validation");
const router = express_1.default.Router();
// ============ APPLICANT ROUTES ============
/**
 * @route   GET /api/v1/interview-slots
 * @desc    Get available interview slots (Applicants/Tutors see only AVAILABLE)
 * @access  Applicant, Tutor, or Admin
 * @query   ?page=1&limit=10&sort=-startTime
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getAllInterviewSlots);
/**
 * @route   GET /api/v1/interview-slots/:id
 * @desc    Get single interview slot details
 * @access  Applicant, Tutor, or Admin
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getSingleInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/book
 * @desc    Book an available interview slot
 * @access  Applicant or Tutor
 * @body    { applicationId: string }
 * @note    Application must be in SUBMITTED or REVISION status
 * @note    Applicant can only have one booked slot at a time
 */
router.patch('/:id/book', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.bookInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.bookInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/cancel
 * @desc    Cancel a booked interview slot
 * @access  Applicant, Tutor, or Admin
 * @body    { cancellationReason: string }
 * @note    Must be at least 1 hour before interview (for applicants/tutors)
 * @note    Reverts application status to SUBMITTED
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.cancelInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.cancelInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/reschedule
 * @desc    Reschedule a booked interview to a different slot
 * @access  Applicant or Tutor
 * @body    { newSlotId: string }
 * @note    Must be at least 1 hour before current interview
 * @note    Current slot becomes available, new slot gets booked
 */
router.patch('/:id/reschedule', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.rescheduleInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.rescheduleInterviewSlot);
// ============ ADMIN ROUTES ============
/**
 * @route   POST /api/v1/interview-slots
 * @desc    Create new interview slot
 * @access  Admin only
 * @body    { startTime: Date, endTime: Date, notes?: string }
 * @note    Prevents overlapping slots for same admin
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.createInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.createInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/complete
 * @desc    Mark interview as completed
 * @access  Admin only
 * @note    Admin can then approve/reject the application separately
 */
router.patch('/:id/complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.markAsCompleted);
/**
 * @route   PATCH /api/v1/interview-slots/:id
 * @desc    Update interview slot (only AVAILABLE slots)
 * @access  Admin only
 * @body    { startTime?, endTime?, notes?, status? }
 * @note    Cannot update booked/completed/cancelled slots
 */
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.updateInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.updateInterviewSlot);
/**
 * @route   DELETE /api/v1/interview-slots/:id
 * @desc    Delete interview slot
 * @access  Admin only
 * @note    Cannot delete booked slots (cancel first)
 */
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.deleteInterviewSlot);
exports.InterviewSlotRoutes = router;
