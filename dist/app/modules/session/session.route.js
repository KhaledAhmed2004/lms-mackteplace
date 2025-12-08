"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const session_controller_1 = require("./session.controller");
const session_validation_1 = require("./session.validation");
const router = express_1.default.Router();
// ============ TUTOR ROUTES ============
/**
 * @route   POST /api/v1/sessions/propose
 * @desc    Propose session in chat (In-chat booking)
 * @access  Tutor only (verified tutors)
 * @body    { chatId: string, subject: string, startTime: Date, endTime: Date, description?: string }
 * @note    Creates message with type: 'session_proposal'
 * @note    Price calculated based on student's subscription tier
 * @note    Proposal expires in 24 hours
 */
router.post('/propose', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.proposeSessionZodSchema), session_controller_1.SessionController.proposeSession);
// ============ STUDENT ROUTES ============
/**
 * @route   POST /api/v1/sessions/proposals/:messageId/accept
 * @desc    Accept session proposal
 * @access  Student only
 * @note    Creates session with status: SCHEDULED
 * @note    Generates Google Meet link (placeholder)
 * @note    Updates proposal message status to ACCEPTED
 */
router.post('/proposals/:messageId/accept', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(session_validation_1.SessionValidation.acceptSessionProposalZodSchema), session_controller_1.SessionController.acceptSessionProposal);
/**
 * @route   POST /api/v1/sessions/proposals/:messageId/reject
 * @desc    Reject session proposal
 * @access  Student only
 * @body    { rejectionReason: string }
 * @note    Updates proposal message status to REJECTED
 */
router.post('/proposals/:messageId/reject', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(session_validation_1.SessionValidation.rejectSessionProposalZodSchema), session_controller_1.SessionController.rejectSessionProposal);
// ============ SHARED ROUTES (STUDENT + TUTOR + ADMIN) ============
/**
 * @route   GET /api/v1/sessions
 * @desc    Get sessions
 * @access  Student (own sessions), Tutor (own sessions), Admin (all sessions)
 * @query   ?status=SCHEDULED&page=1&limit=10&sort=-startTime
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.getAllSessions);
/**
 * @route   GET /api/v1/sessions/:id
 * @desc    Get single session details
 * @access  Student (own), Tutor (own), Admin (all)
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.getSingleSession);
/**
 * @route   PATCH /api/v1/sessions/:id/cancel
 * @desc    Cancel session
 * @access  Student or Tutor (must be participant)
 * @body    { cancellationReason: string }
 * @note    Only SCHEDULED sessions can be cancelled
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.cancelSessionZodSchema), session_controller_1.SessionController.cancelSession);
// ============ ADMIN ROUTES ============
/**
 * @route   PATCH /api/v1/sessions/:id/complete
 * @desc    Manually mark session as completed
 * @access  Admin only
 * @note    Normally automated by cron job
 */
router.patch('/:id/complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(session_validation_1.SessionValidation.completeSessionZodSchema), session_controller_1.SessionController.markAsCompleted);
/**
 * @route   POST /api/v1/sessions/auto-complete
 * @desc    Auto-complete sessions (Cron job endpoint)
 * @access  Admin only
 * @note    Marks sessions as COMPLETED after endTime passes
 * @note    Should be called periodically (e.g., every hour)
 */
router.post('/auto-complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.autoCompleteSessions);
exports.SessionRoutes = router;
