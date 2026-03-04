import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AdminController } from './admin.controller';
import { ExportController } from './export.controller';
import { AdminValidation } from './admin.validation';
import { ActivityLogController } from '../activityLog/activityLog.controller';
import { ActivityLogValidation } from '../activityLog/activityLog.validation';

const router = express.Router();

// ============ DASHBOARD & STATISTICS ============

// Get overview stats with percentage changes (Total Revenue, Students, Tutors)
router.get(
  '/overview-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.overviewStatsQuerySchema),
  AdminController.getOverviewStats,
);

// Get monthly revenue statistics with advanced filters
router.get(
  '/monthly-revenue',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.monthlyRevenueQuerySchema),
  AdminController.getMonthlyRevenue,
);

// Get user distribution by role and/or status
router.get(
  '/user-distribution',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.userDistributionQuerySchema),
  AdminController.getUserDistribution,
);

// Get comprehensive dashboard statistics
router.get(
  '/dashboard',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardStats,
);

// Get revenue statistics by month
router.get(
  '/revenue-by-month',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getRevenueByMonth,
);

// Get most popular subjects by session count
router.get(
  '/popular-subjects',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getPopularSubjects,
);

// Get top tutors by sessions or earnings
router.get(
  '/top-tutors',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopTutors,
);

// Get top students by spending or sessions
router.get(
  '/top-students',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopStudents,
);

// Get user growth statistics by month
router.get(
  '/user-growth',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUserGrowth,
);

// ============ UNIFIED SESSIONS ============

// Get unified view of sessions and trial requests
router.get(
  '/unified-sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUnifiedSessions,
);

// Get session statistics
router.get(
  '/session-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getSessionStats,
);

// Get application statistics by status
router.get(
  '/application-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getApplicationStats,
);

// ============ TRANSACTIONS ============

// Get all transactions (Student Payments + Tutor Payouts)
router.get(
  '/transactions',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTransactions,
);

// Get transaction statistics (totals for student payments and tutor payouts)
router.get(
  '/transaction-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTransactionStats,
);

// ============ ACTIVITY LOG ============

// Get recent platform activities
router.get(
  '/recent-activity',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(ActivityLogValidation.recentActivityQuerySchema),
  ActivityLogController.getRecentActivities,
);

// Get activity statistics
router.get(
  '/activity-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  ActivityLogController.getActivityStats,
);

// ============ CSV EXPORT ============

// Export users to CSV
router.get(
  '/export/users',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportUsers,
);

// Export tutor applications to CSV
router.get(
  '/export/applications',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportApplications,
);

// Export sessions to CSV
router.get(
  '/export/sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSessions,
);

// Export monthly billings to CSV
router.get(
  '/export/billings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportBillings,
);

// Export tutor earnings to CSV
router.get(
  '/export/earnings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportEarnings,
);

// Export subscriptions to CSV
router.get(
  '/export/subscriptions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSubscriptions,
);

// Export trial requests to CSV
router.get(
  '/export/trial-requests',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportTrialRequests,
);

export const AdminRoutes = router;
