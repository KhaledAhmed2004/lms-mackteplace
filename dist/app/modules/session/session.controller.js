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
exports.SessionController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const session_service_1 = require("./session.service");
/**
 * Propose session (Tutor sends in chat)
 */
const proposeSession = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const tutorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield session_service_1.SessionService.proposeSession(tutorId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Session proposal sent successfully',
        data: result,
    });
}));
/**
 * Accept session proposal (Student accepts)
 */
const acceptSessionProposal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { messageId } = req.params;
    const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield session_service_1.SessionService.acceptSessionProposal(messageId, studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Session booked successfully. Google Meet link will be generated.',
        data: result,
    });
}));
/**
 * Reject session proposal (Student rejects)
 */
const rejectSessionProposal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { messageId } = req.params;
    const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { rejectionReason } = req.body;
    const result = yield session_service_1.SessionService.rejectSessionProposal(messageId, studentId, rejectionReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session proposal rejected',
        data: result,
    });
}));
/**
 * Get all sessions
 * Student: Own sessions
 * Tutor: Own sessions
 * Admin: All sessions
 */
const getAllSessions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    const result = yield session_service_1.SessionService.getAllSessions(req.query, userId, userRole);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Sessions retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get single session
 */
const getSingleSession = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield session_service_1.SessionService.getSingleSession(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session retrieved successfully',
        data: result,
    });
}));
/**
 * Cancel session (Student or Tutor)
 */
const cancelSession = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { cancellationReason } = req.body;
    const result = yield session_service_1.SessionService.cancelSession(id, userId, cancellationReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session cancelled successfully',
        data: result,
    });
}));
/**
 * Mark session as completed (Admin/Manual)
 */
const markAsCompleted = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield session_service_1.SessionService.markAsCompleted(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session marked as completed',
        data: result,
    });
}));
/**
 * Auto-complete sessions (Cron job endpoint)
 */
const autoCompleteSessions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield session_service_1.SessionService.autoCompleteSessions();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} sessions auto-completed successfully`,
        data: { completedCount: count },
    });
}));
exports.SessionController = {
    proposeSession,
    acceptSessionProposal,
    rejectSessionProposal,
    getAllSessions,
    getSingleSession,
    cancelSession,
    markAsCompleted,
    autoCompleteSessions,
};
