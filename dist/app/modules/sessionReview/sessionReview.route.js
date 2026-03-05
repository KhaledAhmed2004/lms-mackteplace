"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionReviewRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const sessionReview_controller_1 = require("./sessionReview.controller");
const sessionReview_validation_1 = require("./sessionReview.validation");
const router = express_1.default.Router();
// ============ STUDENT ROUTES ============
// Create a new review for a completed session
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.createReviewZodSchema), sessionReview_controller_1.SessionReviewController.createReview);
// Get student's own reviews
router.get('/my-reviews', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionReview_controller_1.SessionReviewController.getMyReviews);
// Update own review
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.updateReviewZodSchema), sessionReview_controller_1.SessionReviewController.updateReview);
// Delete own review
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionReview_controller_1.SessionReviewController.deleteReview);
// ============ PUBLIC/TUTOR ROUTES ============
// Get tutor's reviews (public only, or all if admin)
router.get('/tutor/:tutorId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getTutorReviews);
// Get tutor's review statistics
router.get('/tutor/:tutorId/stats', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getTutorStats);
// Get review for a specific session
router.get('/session/:sessionId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getReviewBySession);
// Get single review details
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getSingleReview);
// ============ ADMIN ROUTES ============
// Toggle review visibility (hide/show publicly)
router.patch('/:id/visibility', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.toggleVisibility);
// Link orphaned reviews to sessions (migration helper)
router.post('/link-orphaned', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.linkOrphanedReviews);
// Admin: Create a review for a tutor (without session requirement)
router.post('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.adminCreateReviewZodSchema), sessionReview_controller_1.SessionReviewController.adminCreateReview);
// Admin: Update any review
router.patch('/admin/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.adminUpdateReviewZodSchema), sessionReview_controller_1.SessionReviewController.adminUpdateReview);
// Admin: Delete any review
router.delete('/admin/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.adminDeleteReview);
exports.SessionReviewRoutes = router;
