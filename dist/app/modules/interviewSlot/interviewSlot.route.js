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
// Note: Only applicants with SELECTED_FOR_INTERVIEW status can access these
// Get my booked interview slot
router.get('/my-interview', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), interviewSlot_controller_1.InterviewSlotController.getMyBookedInterview);
// Get all scheduled meetings (BOOKED interview slots)
router.get('/scheduled-meetings', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getScheduledMeetings);
// Get Agora meeting token for interview video call
router.get('/:id/meeting-token', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getMeetingToken);
// Get available interview slots
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getAllInterviewSlots);
// Get single interview slot details
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getSingleInterviewSlot);
// Book an available interview slot
router.patch('/:id/book', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.bookInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.bookInterviewSlot);
// Cancel a booked interview slot
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.cancelInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.cancelInterviewSlot);
// Reschedule a booked interview to a different slot
router.patch('/:id/reschedule', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.rescheduleInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.rescheduleInterviewSlot);
// ============ ADMIN ROUTES ============
// Create new interview slot
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.createInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.createInterviewSlot);
// Mark interview as completed
router.patch('/:id/complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.markAsCompleted);
// Update interview slot (only AVAILABLE slots)
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.updateInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.updateInterviewSlot);
// Delete interview slot
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.deleteInterviewSlot);
exports.InterviewSlotRoutes = router;
