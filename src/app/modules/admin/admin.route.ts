import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { AdminController } from './admin.controller';
import { ExportController } from './export.controller';

const router = express.Router();

// ============ DASHBOARD & STATISTICS ============

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get comprehensive dashboard statistics
 * @access  Admin only
 * @returns User stats, application stats, session stats, revenue stats, subscription stats
 */
router.get(
  '/dashboard',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardStats
);

/**
 * @route   GET /api/v1/admin/revenue-by-month
 * @desc    Get revenue statistics by month
 * @access  Admin only
 * @query   ?year=2024&months=1,2,3 (optional, defaults to current year, all months)
 */
router.get(
  '/revenue-by-month',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getRevenueByMonth
);

/**
 * @route   GET /api/v1/admin/popular-subjects
 * @desc    Get most popular subjects by session count
 * @access  Admin only
 * @query   ?limit=10 (default: 10)
 */
router.get(
  '/popular-subjects',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getPopularSubjects
);

/**
 * @route   GET /api/v1/admin/top-tutors
 * @desc    Get top tutors by sessions or earnings
 * @access  Admin only
 * @query   ?limit=10&sortBy=sessions (sortBy: sessions|earnings, default: sessions)
 */
router.get(
  '/top-tutors',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopTutors
);

/**
 * @route   GET /api/v1/admin/top-students
 * @desc    Get top students by spending or sessions
 * @access  Admin only
 * @query   ?limit=10&sortBy=spending (sortBy: spending|sessions, default: spending)
 */
router.get(
  '/top-students',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopStudents
);

/**
 * @route   GET /api/v1/admin/user-growth
 * @desc    Get user growth statistics by month
 * @access  Admin only
 * @query   ?year=2024&months=1,2,3 (optional, defaults to current year, all months)
 */
router.get(
  '/user-growth',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUserGrowth
);

// ============ CSV EXPORT ============

/**
 * @route   GET /api/v1/admin/export/users
 * @desc    Export users to CSV
 * @access  Admin only
 * @query   ?role=STUDENT (optional: filter by role)
 */
router.get(
  '/export/users',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportUsers
);

/**
 * @route   GET /api/v1/admin/export/applications
 * @desc    Export tutor applications to CSV
 * @access  Admin only
 * @query   ?status=SUBMITTED (optional: filter by status)
 */
router.get(
  '/export/applications',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportApplications
);

/**
 * @route   GET /api/v1/admin/export/sessions
 * @desc    Export sessions to CSV
 * @access  Admin only
 * @query   ?status=COMPLETED&startDate=2024-01-01&endDate=2024-12-31
 */
router.get(
  '/export/sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSessions
);

/**
 * @route   GET /api/v1/admin/export/billings
 * @desc    Export monthly billings to CSV
 * @access  Admin only
 * @query   ?status=PAID&year=2024&month=1
 */
router.get(
  '/export/billings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportBillings
);

/**
 * @route   GET /api/v1/admin/export/earnings
 * @desc    Export tutor earnings to CSV
 * @access  Admin only
 * @query   ?status=PAID&year=2024&month=1
 */
router.get(
  '/export/earnings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportEarnings
);

/**
 * @route   GET /api/v1/admin/export/subscriptions
 * @desc    Export subscriptions to CSV
 * @access  Admin only
 * @query   ?status=ACTIVE (optional: filter by status)
 */
router.get(
  '/export/subscriptions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSubscriptions
);

/**
 * @route   GET /api/v1/admin/export/trial-requests
 * @desc    Export trial requests to CSV
 * @access  Admin only
 * @query   ?status=PENDING (optional: filter by status)
 */
router.get(
  '/export/trial-requests',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportTrialRequests
);

export const AdminRoutes = router;
