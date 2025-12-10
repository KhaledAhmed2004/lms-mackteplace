"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorApplicationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const tutorApplication_controller_1 = require("./tutorApplication.controller");
const tutorApplication_validation_1 = require("./tutorApplication.validation");
const router = express_1.default.Router();
/**
 * @route   POST /api/v1/applications
 * @desc    Submit tutor application
 * @access  Any authenticated user
 * @body    { subjects[], name, email, phone, address, birthDate, cvUrl, abiturCertificateUrl, educationProofUrls[]? }
 * @note    Files must be uploaded first via file upload endpoint
 * @note    User role will be changed to APPLICANT after submission
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.APPLICANT), // Any user can apply
(0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.createApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.submitApplication);
/**
 * @route   GET /api/v1/applications/my-application
 * @desc    Get my application status
 * @access  Applicant only
 */
router.get('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), tutorApplication_controller_1.TutorApplicationController.getMyApplication);
// ============ ADMIN ROUTES ============
/**
 * @route   GET /api/v1/applications
 * @desc    Get all applications with filtering, searching, pagination
 * @access  Admin only
 * @query   ?page=1&limit=10&searchTerm=john&status=SUBMITTED&phase=1
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getAllApplications);
/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single application by ID
 * @access  Admin only
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getSingleApplication);
/**
 * @route   PATCH /api/v1/applications/:id/approve-phase2
 * @desc    Approve application to Phase 2 (Interview scheduling)
 * @access  Admin only
 * @body    { adminNotes?: string }
 * @note    Sends email to applicant with interview scheduling link
 */
router.patch('/:id/approve-phase2', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.approveToPhase2ZodSchema), tutorApplication_controller_1.TutorApplicationController.approveToPhase2);
/**
 * @route   PATCH /api/v1/applications/:id/reject
 * @desc    Reject application
 * @access  Admin only
 * @body    { rejectionReason: string }
 * @note    Sends rejection email to applicant
 */
router.patch('/:id/reject', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.rejectApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.rejectApplication);
/**
 * @route   PATCH /api/v1/applications/:id/mark-as-tutor
 * @desc    Mark applicant as tutor (Final approval - Phase 3)
 * @access  Admin only
 * @note    Changes user role from APPLICANT to TUTOR
 * @note    Sends welcome email to new tutor
 */
router.patch('/:id/mark-as-tutor', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.markAsTutor);
/**
 * @route   PATCH /api/v1/applications/:id
 * @desc    Update application status (generic update)
 * @access  Admin only
 * @body    { status?, rejectionReason?, adminNotes? }
 */
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.updateApplicationStatusZodSchema), tutorApplication_controller_1.TutorApplicationController.updateApplicationStatus);
/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete application (hard delete)
 * @access  Admin only
 */
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.deleteApplication);
exports.TutorApplicationRoutes = router;
