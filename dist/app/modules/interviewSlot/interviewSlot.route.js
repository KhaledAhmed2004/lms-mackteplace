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
 * @desc    Get available interview slots (Applicants see only AVAILABLE)
 * @access  Applicant
 * @query   ?page=1&limit=10&sort=-startTime
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getAllInterviewSlots);
/**
 * @route   GET /api/v1/interview-slots/:id
 * @desc    Get single interview slot details
 * @access  Applicant or Admin
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getSingleInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/book
 * @desc    Book an available interview slot
 * @access  Applicant only
 * @body    { applicationId: string }
 * @note    Application must be in DOCUMENTS_REVIEWED status
 * @note    Applicant can only have one booked slot at a time
 * @note    Updates application status to INTERVIEW_SCHEDULED
 */
router.patch('/:id/book', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.bookInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.bookInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/cancel
 * @desc    Cancel a booked interview slot
 * @access  Applicant or Admin (must be owner of slot)
 * @body    { cancellationReason: string }
 * @note    Reverts application status to DOCUMENTS_REVIEWED
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.cancelInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.cancelInterviewSlot);
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
 * @note    Updates application status to INTERVIEW_DONE
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
