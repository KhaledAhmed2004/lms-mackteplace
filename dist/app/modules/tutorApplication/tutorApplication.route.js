"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorApplicationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const tutorApplication_controller_1 = require("./tutorApplication.controller");
const tutorApplication_validation_1 = require("./tutorApplication.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
// Submit tutor application (creates user + application)
router.post('/', (0, fileHandler_1.fileHandler)([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
]), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.createApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.submitApplication);
// ============ APPLICANT ROUTES ============
// Get my application status
router.get('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), tutorApplication_controller_1.TutorApplicationController.getMyApplication);
// Update my application (when in REVISION status)
router.patch('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, fileHandler_1.fileHandler)([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
]), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.updateMyApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.updateMyApplication);
// ============ ADMIN ROUTES ============
// Get all applications with filtering, searching, pagination
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getAllApplications);
// Get single application by ID
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getSingleApplication);
// Select application for interview (after initial review)
router.patch('/:id/select-for-interview', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.selectForInterviewZodSchema), tutorApplication_controller_1.TutorApplicationController.selectForInterview);
// Approve application after interview (changes user role to TUTOR)
router.patch('/:id/approve', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.approveApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.approveApplication);
// Reject application
router.patch('/:id/reject', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.rejectApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.rejectApplication);
// Send application for revision (ask applicant to fix something)
router.patch('/:id/revision', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.sendForRevisionZodSchema), tutorApplication_controller_1.TutorApplicationController.sendForRevision);
// Delete application (hard delete)
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.deleteApplication);
exports.TutorApplicationRoutes = router;
