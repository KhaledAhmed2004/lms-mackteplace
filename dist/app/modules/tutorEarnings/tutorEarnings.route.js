"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorEarningsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const tutorEarnings_controller_1 = require("./tutorEarnings.controller");
const tutorEarnings_validation_1 = require("./tutorEarnings.validation");
const router = express_1.default.Router();
// ============ TUTOR ROUTES ============
// Get tutor's comprehensive stats including level progress
router.get('/my-stats', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getMyStats);
// Get tutor's earnings history
router.get('/my-earnings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getMyEarnings);
// Get tutor's formatted earnings history for frontend
router.get('/history', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getEarningsHistory);
// Get tutor's payout settings (IBAN, recipient)
router.get('/payout-settings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getPayoutSettings);
// Update tutor's payout settings
router.patch('/payout-settings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.updatePayoutSettingsZodSchema), tutorEarnings_controller_1.TutorEarningsController.updatePayoutSettings);
// Get single earnings record
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.getSingleEarning);
// ============ ADMIN ROUTES ============
// Generate tutor earnings for all tutors (cron job, month-end)
router.post('/generate', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.generateTutorEarningsZodSchema), tutorEarnings_controller_1.TutorEarningsController.generateTutorEarnings);
// Get all earnings
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.getAllEarnings);
// Initiate Stripe Connect payout to tutor
router.patch('/:id/initiate-payout', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.initiatePayoutZodSchema), tutorEarnings_controller_1.TutorEarningsController.initiatePayout);
// Mark payout as paid
router.patch('/:id/mark-paid', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.markAsPaid);
// Mark payout as failed
router.patch('/:id/mark-failed', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.markAsFailedZodSchema), tutorEarnings_controller_1.TutorEarningsController.markAsFailed);
exports.TutorEarningsRoutes = router;
