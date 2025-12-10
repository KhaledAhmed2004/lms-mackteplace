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
const trialRequest_controller_1 = require("./trialRequest.controller");
const trialRequest_validation_1 = require("./trialRequest.validation");
const router = express_1.default.Router();
// ============ PUBLIC / GUEST ROUTES ============
/**
 * @route   POST /api/v1/trial-requests
 * @desc    Create trial request (Uber-style request)
 * @access  Public (Guest or Student)
 * @body    {
 *   studentInfo: { firstName, lastName, email, isUnder18, dateOfBirth? },
 *   subject: ObjectId (Subject ID),
 *   gradeLevel: GRADE_LEVEL enum,
 *   schoolType: SCHOOL_TYPE enum,
 *   description: string,
 *   preferredLanguage: 'ENGLISH' | 'GERMAN',
 *   learningGoals?: string,
 *   documents?: string[],
 *   guardianInfo?: { name, email, phone, relationship? } (Required if under 18),
 *   preferredDateTime?: Date
 * }
 * @note    Guest users can create requests without authentication
 * @note    Student can only have one pending request at a time (checked by studentId or email)
 * @note    Request expires after 24 hours
 * @note    Guardian info required for students under 18
 */
router.post('/', optionalAuth_1.default, // Allow both authenticated and guest users
(0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.createTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.createTrialRequest);
// ============ STUDENT ROUTES ============
/**
 * @route   GET /api/v1/trial-requests/my-requests
 * @desc    Get student's own trial requests
 * @access  Student only
 * @query   ?status=PENDING&page=1&limit=10
 */
router.get('/my-requests', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), trialRequest_controller_1.TrialRequestController.getMyTrialRequests);
/**
 * @route   PATCH /api/v1/trial-requests/:id/cancel
 * @desc    Cancel trial request
 * @access  Student only (must own the request)
 * @body    { cancellationReason: string }
 * @note    Only PENDING requests can be cancelled
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.cancelTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.cancelTrialRequest);
// ============ TUTOR ROUTES ============
/**
 * @route   GET /api/v1/trial-requests/matching
 * @desc    Get trial requests matching tutor's subjects
 * @access  Tutor only (verified tutors only)
 * @query   ?subject=Math&page=1&limit=10
 * @note    Only shows PENDING requests in tutor's teaching subjects
 * @note    Excludes expired requests
 */
router.get('/matching', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), trialRequest_controller_1.TrialRequestController.getMatchingTrialRequests);
/**
 * @route   PATCH /api/v1/trial-requests/:id/accept
 * @desc    Accept trial request (Uber-style accept)
 * @access  Tutor only (verified tutors only)
 * @note    Creates chat between student and tutor
 * @note    Changes request status to ACCEPTED
 * @note    Tutor must teach the requested subject
 * @note    Sends notification to student
 */
router.patch('/:id/accept', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), trialRequest_controller_1.TrialRequestController.acceptTrialRequest);
// ============ SHARED ROUTES ============
/**
 * @route   GET /api/v1/trial-requests/:id
 * @desc    Get single trial request details
 * @access  Student (own requests), Tutor (matching requests), Admin (all)
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.getSingleTrialRequest);
// ============ ADMIN ROUTES ============
/**
 * @route   GET /api/v1/trial-requests
 * @desc    Get all trial requests
 * @access  Admin only
 * @query   ?status=PENDING&subject=Math&searchTerm=help&page=1&limit=10
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.getAllTrialRequests);
/**
 * @route   POST /api/v1/trial-requests/expire-old
 * @desc    Expire old trial requests (Cron job endpoint)
 * @access  Admin only
 * @note    Updates PENDING requests past expiresAt to EXPIRED
 * @note    Should be called periodically (e.g., every hour)
 */
router.post('/expire-old', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.expireOldRequests);
exports.TrialRequestRoutes = router;
