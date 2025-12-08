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
exports.AdminController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const admin_service_1 = require("./admin.service");
/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getDashboardStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Dashboard statistics retrieved successfully',
        data: result,
    });
}));
/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year, months } = req.query;
    const yearNumber = year ? parseInt(year) : new Date().getFullYear();
    const monthsArray = months
        ? months.split(',').map(m => parseInt(m))
        : undefined;
    const result = yield admin_service_1.AdminService.getRevenueByMonth(yearNumber, monthsArray);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Revenue statistics retrieved successfully',
        data: result,
    });
}));
/**
 * Get popular subjects
 */
const getPopularSubjects = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit } = req.query;
    const limitNumber = limit ? parseInt(limit) : 10;
    const result = yield admin_service_1.AdminService.getPopularSubjects(limitNumber);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Popular subjects retrieved successfully',
        data: result,
    });
}));
/**
 * Get top tutors
 */
const getTopTutors = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit, sortBy } = req.query;
    const limitNumber = limit ? parseInt(limit) : 10;
    const sortByValue = sortBy || 'sessions';
    const result = yield admin_service_1.AdminService.getTopTutors(limitNumber, sortByValue);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Top tutors retrieved successfully',
        data: result,
    });
}));
/**
 * Get top students
 */
const getTopStudents = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit, sortBy } = req.query;
    const limitNumber = limit ? parseInt(limit) : 10;
    const sortByValue = sortBy || 'spending';
    const result = yield admin_service_1.AdminService.getTopStudents(limitNumber, sortByValue);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Top students retrieved successfully',
        data: result,
    });
}));
/**
 * Get user growth statistics
 */
const getUserGrowth = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year, months } = req.query;
    const yearNumber = year ? parseInt(year) : new Date().getFullYear();
    const monthsArray = months
        ? months.split(',').map(m => parseInt(m))
        : undefined;
    const result = yield admin_service_1.AdminService.getUserGrowth(yearNumber, monthsArray);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'User growth statistics retrieved successfully',
        data: result,
    });
}));
exports.AdminController = {
    getDashboardStats,
    getRevenueByMonth,
    getPopularSubjects,
    getTopTutors,
    getTopStudents,
    getUserGrowth,
};
