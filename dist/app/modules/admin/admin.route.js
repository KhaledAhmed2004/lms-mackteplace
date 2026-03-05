"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const admin_controller_1 = require("./admin.controller");
const export_controller_1 = require("./export.controller");
const admin_validation_1 = require("./admin.validation");
const activityLog_controller_1 = require("../activityLog/activityLog.controller");
const activityLog_validation_1 = require("../activityLog/activityLog.validation");
const router = express_1.default.Router();
// ============ DASHBOARD & STATISTICS ============
// Get overview stats with percentage changes (Total Revenue, Students, Tutors)
router.get('/overview-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(admin_validation_1.AdminValidation.overviewStatsQuerySchema), admin_controller_1.AdminController.getOverviewStats);
// Get monthly revenue statistics with advanced filters
router.get('/monthly-revenue', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(admin_validation_1.AdminValidation.monthlyRevenueQuerySchema), admin_controller_1.AdminController.getMonthlyRevenue);
// Get user distribution by role and/or status
router.get('/user-distribution', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(admin_validation_1.AdminValidation.userDistributionQuerySchema), admin_controller_1.AdminController.getUserDistribution);
// Get comprehensive dashboard statistics
router.get('/dashboard', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getDashboardStats);
// Get revenue statistics by month
router.get('/revenue-by-month', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getRevenueByMonth);
// Get most popular subjects by session count
router.get('/popular-subjects', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getPopularSubjects);
// Get top tutors by sessions or earnings
router.get('/top-tutors', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTopTutors);
// Get top students by spending or sessions
router.get('/top-students', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTopStudents);
// Get user growth statistics by month
router.get('/user-growth', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getUserGrowth);
// ============ UNIFIED SESSIONS ============
// Get unified view of sessions and trial requests
router.get('/unified-sessions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getUnifiedSessions);
// Get session statistics
router.get('/session-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getSessionStats);
// Get application statistics by status
router.get('/application-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getApplicationStats);
// ============ TRANSACTIONS ============
// Get all transactions (Student Payments + Tutor Payouts)
router.get('/transactions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTransactions);
// Get transaction statistics (totals for student payments and tutor payouts)
router.get('/transaction-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTransactionStats);
// ============ ACTIVITY LOG ============
// Get recent platform activities
router.get('/recent-activity', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(activityLog_validation_1.ActivityLogValidation.recentActivityQuerySchema), activityLog_controller_1.ActivityLogController.getRecentActivities);
// Get activity statistics
router.get('/activity-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), activityLog_controller_1.ActivityLogController.getActivityStats);
// ============ CSV EXPORT ============
// Export users to CSV
router.get('/export/users', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportUsers);
// Export tutor applications to CSV
router.get('/export/applications', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportApplications);
// Export sessions to CSV
router.get('/export/sessions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportSessions);
// Export monthly billings to CSV
router.get('/export/billings', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportBillings);
// Export tutor earnings to CSV
router.get('/export/earnings', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportEarnings);
// Export subscriptions to CSV
router.get('/export/subscriptions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportSubscriptions);
// Export trial requests to CSV
router.get('/export/trial-requests', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportTrialRequests);
exports.AdminRoutes = router;
