"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const grade_controller_1 = require("./grade.controller");
const grade_validation_1 = require("./grade.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
// Get all active grades (for students/tutors to see available grades)
router.get('/active', grade_controller_1.GradeController.getActiveGrades);
// Get single grade by ID
router.get('/:gradeId', grade_controller_1.GradeController.getSingleGrade);
// Get all grades with filtering, searching, pagination
router.get('/', grade_controller_1.GradeController.getAllGrades);
// ============ ADMIN ONLY ROUTES ============
// Create new grade
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(grade_validation_1.GradeValidation.createGradeZodSchema), grade_controller_1.GradeController.createGrade);
// Update grade
router.patch('/:gradeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(grade_validation_1.GradeValidation.updateGradeZodSchema), grade_controller_1.GradeController.updateGrade);
// Delete grade (soft delete - sets isActive to false)
router.delete('/:gradeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), grade_controller_1.GradeController.deleteGrade);
exports.GradeRoutes = router;
