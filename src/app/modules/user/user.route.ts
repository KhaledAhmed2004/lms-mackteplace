import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { fileHandler } from '../../middlewares/fileHandler';
import { rateLimitMiddleware } from '../../middlewares/rateLimit';
import express from 'express';

const router = express.Router();

// Create a new user
router.post(
  '/',
  rateLimitMiddleware({ windowMs: 60_000, max: 20, routeName: 'create-user' }),
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

// Get user own profile
router.get(
  '/profile',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.APPLICANT),
  UserController.getUserProfile
);

// Update user profile
router.patch(
  '/profile',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.APPLICANT),
  fileHandler(['profilePicture']),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateProfile
);

// ============ TUTOR: STATISTICS ============

/**
 * @route   GET /api/v1/users/my-statistics
 * @desc    Get comprehensive tutor statistics (level, earnings, sessions, students)
 * @access  Tutor only
 * @returns currentLevel, sessionsToNextLevel, totalSessions, completedSessions,
 *          totalHoursTaught, totalStudents, averageRating, totalEarnings, pendingFeedbackCount
 */
router.get(
  '/my-statistics',
  auth(USER_ROLES.TUTOR),
  UserController.getTutorStatistics
);

// ============ ADMIN: STUDENT MANAGEMENT ============

// Get all students (admin only)
router.get(
  '/students',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.getAllStudents
);

// Block a student (admin only)
router.patch(
  '/students/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockStudent
);

// Unblock a student (admin only)
router.patch(
  '/students/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockStudent
);

// ============ ADMIN: TUTOR MANAGEMENT ============

// Get all tutors (admin only)
router.get(
  '/tutors',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.getAllTutors
);

// Block a tutor (admin only)
router.patch(
  '/tutors/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockTutor
);

// Unblock a tutor (admin only)
router.patch(
  '/tutors/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockTutor
);

// Update tutor subjects (admin only)
router.patch(
  '/tutors/:id/subjects',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(UserValidation.updateTutorSubjectsZodSchema),
  UserController.updateTutorSubjects
);

// ============ GENERAL ADMIN ROUTES ============

// Get all users (admin only)
router.get('/', auth(USER_ROLES.SUPER_ADMIN), UserController.getAllUsers);

// Block a user (generic - admin only)
router.patch(
  '/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockUser
);

// Unblock a user (generic - admin only)
router.patch(
  '/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockUser
);

// Get a specific user by ID (admin only)
router.get('/:id', auth(USER_ROLES.SUPER_ADMIN), UserController.getUserById);

// Public user details (allow guest), apply rate limit
router.get(
  '/:id/user',
  auth(USER_ROLES.GUEST),
  rateLimitMiddleware({ windowMs: 60_000, max: 60, routeName: 'public-user-details' }),
  UserController.getUserDetailsById
);

export const UserRoutes = router;
