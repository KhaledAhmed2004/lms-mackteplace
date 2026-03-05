"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequestRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const optionalAuth_1 = __importDefault(require("../../middlewares/optionalAuth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const trialRequest_controller_1 = require("./trialRequest.controller");
const trialRequest_validation_1 = require("./trialRequest.validation");
const router = express_1.default.Router();
// ============ PUBLIC / GUEST ROUTES ============
// Create trial request (guest or student)
router.post('/', (0, fileHandler_1.fileHandler)([{ name: 'documents', maxCount: 3 }]), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.createTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.createTrialRequest);
// ============ STUDENT ROUTES ============
// NOTE: GET /my-requests removed - use /session-requests/my-requests instead (unified view)
// Cancel trial request
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.cancelTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.cancelTrialRequest);
// Extend trial request by 7 more days
router.patch('/:id/extend', optionalAuth_1.default, trialRequest_controller_1.TrialRequestController.extendTrialRequest);
// ============ TUTOR ROUTES ============
// Get available trial requests matching tutor's subjects
router.get('/available', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), trialRequest_controller_1.TrialRequestController.getAvailableTrialRequests);
// Get trial requests the tutor has accepted
router.get('/my-accepted', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), trialRequest_controller_1.TrialRequestController.getMyAcceptedTrialRequests);
// Accept trial request (creates chat between student and tutor)
router.patch('/:id/accept', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.acceptTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.acceptTrialRequest);
// ============ SHARED ROUTES ============
// Get single trial request details
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.getSingleTrialRequest);
// ============ ADMIN ROUTES ============
// NOTE: GET / (all trial requests) removed - use /session-requests instead (unified view)
// Expire old trial requests (Cron job endpoint)
router.post('/expire-old', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.expireOldRequests);
// Send expiration reminder emails (Cron job endpoint)
router.post('/send-reminders', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.sendExpirationReminders);
// Auto-delete expired requests (Cron job endpoint)
router.post('/auto-delete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.autoDeleteExpiredRequests);
exports.TrialRequestRoutes = router;
