"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorApplicationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const tutorApplication_service_1 = require("./tutorApplication.service");
/**
 * Submit tutor application
 * User must upload files first, then submit application with file URLs
 */
const submitApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // From auth middleware
    const result = yield tutorApplication_service_1.TutorApplicationService.submitApplication(userId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Application submitted successfully',
        data: result,
    });
}));
/**
 * Get my application (applicant view)
 */
const getMyApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield tutorApplication_service_1.TutorApplicationService.getMyApplication(userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application retrieved successfully',
        data: result,
    });
}));
/**
 * Get all applications (admin view)
 * With filtering, searching, pagination
 */
const getAllApplications = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorApplication_service_1.TutorApplicationService.getAllApplications(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Applications retrieved successfully',
        data: result.data,
        meta: result.meta,
    });
}));
/**
 * Get single application (admin view)
 */
const getSingleApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorApplication_service_1.TutorApplicationService.getSingleApplication(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application retrieved successfully',
        data: result,
    });
}));
/**
 * Approve application to Phase 2 (Interview)
 * Admin only
 */
const approveToPhase2 = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = yield tutorApplication_service_1.TutorApplicationService.approveToPhase2(id, adminNotes);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application approved for interview',
        data: result,
    });
}));
/**
 * Reject application
 * Admin only
 */
const rejectApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const result = yield tutorApplication_service_1.TutorApplicationService.rejectApplication(id, rejectionReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application rejected',
        data: result,
    });
}));
/**
 * Mark as tutor (Final approval - Phase 3)
 * Admin only
 */
const markAsTutor = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorApplication_service_1.TutorApplicationService.markAsTutor(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Applicant approved as tutor successfully',
        data: result,
    });
}));
/**
 * Update application status
 * Admin only
 */
const updateApplicationStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorApplication_service_1.TutorApplicationService.updateApplicationStatus(id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application status updated successfully',
        data: result,
    });
}));
/**
 * Delete application
 * Admin only
 */
const deleteApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorApplication_service_1.TutorApplicationService.deleteApplication(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application deleted successfully',
        data: result,
    });
}));
exports.TutorApplicationController = {
    submitApplication,
    getMyApplication,
    getAllApplications,
    getSingleApplication,
    approveToPhase2,
    rejectApplication,
    markAsTutor,
    updateApplicationStatus,
    deleteApplication,
};
