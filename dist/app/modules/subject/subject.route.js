"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const subject_controller_1 = require("./subject.controller");
const subject_validation_1 = require("./subject.validation");
const router = express_1.default.Router();
// Get all active subjects (for students/tutors to see available subjects)
router.get('/active', subject_controller_1.SubjectController.getActiveSubjects);
// Get single subject by ID
router.get('/:subjectId', subject_controller_1.SubjectController.getSingleSubject);
// Get all subjects with filtering, searching, pagination
router.get('/', subject_controller_1.SubjectController.getAllSubjects);
// Create new subject
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(subject_validation_1.SubjectValidation.createSubjectZodSchema), subject_controller_1.SubjectController.createSubject);
// Update subject
router.patch('/:subjectId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(subject_validation_1.SubjectValidation.updateSubjectZodSchema), subject_controller_1.SubjectController.updateSubject);
// Delete subject (blocked if active requests exist)
router.delete('/:subjectId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), subject_controller_1.SubjectController.deleteSubject);
exports.SubjectRoutes = router;
