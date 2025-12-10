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
exports.TrialRequestController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const trialRequest_service_1 = require("./trialRequest.service");
/**
 * Create trial request (Student or Guest)
 * Can be used by:
 * - Logged-in students (auth token required)
 * - Guest users (no auth required, studentInfo must be complete)
 */
const createTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // studentId will be null for guest users
    const studentId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
    const result = yield trialRequest_service_1.TrialRequestService.createTrialRequest(studentId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Trial request created successfully. Matching tutors will be notified.',
        data: result,
    });
}));
/**
 * Get matching trial requests for tutor
 */
const getMatchingTrialRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield trialRequest_service_1.TrialRequestService.getMatchingTrialRequests(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Matching trial requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get student's own trial requests
 */
const getMyTrialRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield trialRequest_service_1.TrialRequestService.getMyTrialRequests(studentId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Your trial requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get all trial requests (Admin)
 */
const getAllTrialRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield trialRequest_service_1.TrialRequestService.getAllTrialRequests(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get single trial request
 */
const getSingleTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield trialRequest_service_1.TrialRequestService.getSingleTrialRequest(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request retrieved successfully',
        data: result,
    });
}));
/**
 * Accept trial request (Tutor)
 */
const acceptTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const tutorId = req.user.id;
    const result = yield trialRequest_service_1.TrialRequestService.acceptTrialRequest(id, tutorId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request accepted successfully. Chat created with student.',
        data: result,
    });
}));
/**
 * Cancel trial request (Student)
 */
const cancelTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const studentId = req.user.id;
    const { cancellationReason } = req.body;
    const result = yield trialRequest_service_1.TrialRequestService.cancelTrialRequest(id, studentId, cancellationReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request cancelled successfully',
        data: result,
    });
}));
/**
 * Expire old trial requests (Cron job endpoint)
 */
const expireOldRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield trialRequest_service_1.TrialRequestService.expireOldRequests();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} trial requests expired successfully`,
        data: { expiredCount: count },
    });
}));
exports.TrialRequestController = {
    createTrialRequest,
    getMatchingTrialRequests,
    getMyTrialRequests,
    getAllTrialRequests,
    getSingleTrialRequest,
    acceptTrialRequest,
    cancelTrialRequest,
    expireOldRequests,
};
