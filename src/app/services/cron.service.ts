/**
 * Cron Job Service
 *
 * This service handles automated tasks:
 * - Session reminders (24 hours before, 1 hour before)
 * - Trial request auto-expiration (24 hours)
 * - Month-end billing generation
 * - Month-end tutor earnings generation
 * - Session auto-completion with attendance tracking (after endTime)
 */

import { logger, errorLogger } from '../../shared/logger';
import cron from 'node-cron';

// ============================================
// 🧪 TEST MODE CONFIGURATION
// ============================================
// Set to true for testing - runs session transition every 1 minute
// Set to false for production - runs every 5 minutes
const TEST_MODE = true;
// ============================================

// Import services
import { MonthlyBillingService } from '../modules/monthlyBilling/monthlyBilling.service';
import { TutorEarningsService } from '../modules/tutorEarnings/tutorEarnings.service';
import { SessionService } from '../modules/session/session.service';
import { InterviewSlotService } from '../modules/interviewSlot/interviewSlot.service';
import { TrialRequest } from '../modules/trialRequest/trialRequest.model';
import { TRIAL_REQUEST_STATUS } from '../modules/trialRequest/trialRequest.interface';
import { Session } from '../modules/session/session.model';
import { SESSION_STATUS } from '../modules/session/session.interface';

/**
 * Auto-expire trial requests after 24 hours
 * Runs every hour
 */
export const expireTrialRequests = async () => {
  try {
    const now = new Date();

    const expiredRequests = await TrialRequest.updateMany(
      {
        status: TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $lte: now },
      },
      {
        $set: { status: TRIAL_REQUEST_STATUS.EXPIRED },
      }
    );

    if (expiredRequests.modifiedCount > 0) {
      logger.info(`Expired ${expiredRequests.modifiedCount} trial requests`);
    }
  } catch (error) {
    errorLogger.error('Failed to expire trial requests', { error });
  }
};

/**
 * Auto-transition session statuses with attendance tracking
 * TEST_MODE: Runs every 1 minute
 * PRODUCTION: Runs every 5 minutes
 *
 * Handles:
 * - SCHEDULED → STARTING_SOON (10 min before)
 * - STARTING_SOON → IN_PROGRESS (at start time)
 * - IN_PROGRESS → COMPLETED/NO_SHOW/EXPIRED (at end time, with 80% attendance check)
 */
export const autoTransitionSessions = async () => {
  try {
    const result = await SessionService.autoTransitionSessionStatuses();

    const totalChanges = result.startingSoon + result.inProgress + result.completed + result.noShow + result.expired;

    if (totalChanges > 0) {
      logger.info(`Session auto-transition: ${result.startingSoon} starting soon, ${result.inProgress} in progress, ${result.completed} completed, ${result.noShow} no-show, ${result.expired} expired`);
    }
  } catch (error) {
    errorLogger.error('Failed to auto-transition sessions', { error });
  }
};

/**
 * @deprecated Use autoTransitionSessions instead
 * Keeping for backward compatibility
 */
export const autoCompleteSessions = async () => {
  await autoTransitionSessions();
};

/**
 * Send session reminders
 * Runs every hour
 */
export const sendSessionReminders = async () => {
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Find sessions starting in 24 hours
    const sessionsIn24Hours = await Session.find({
      status: SESSION_STATUS.SCHEDULED,
      startTime: {
        $gte: twentyFourHoursLater,
        $lte: new Date(twentyFourHoursLater.getTime() + 60 * 60 * 1000), // 1-hour window
      },
    })
      .populate('studentId', 'name email')
      .populate('tutorId', 'name email');

    // Find sessions starting in 1 hour
    const sessionsIn1Hour = await Session.find({
      status: SESSION_STATUS.SCHEDULED,
      startTime: {
        $gte: oneHourLater,
        $lte: new Date(oneHourLater.getTime() + 10 * 60 * 1000), // 10-minute window
      },
    })
      .populate('studentId', 'name email')
      .populate('tutorId', 'name email');

    // TODO: Send email reminders
    // for (const session of sessionsIn24Hours) {
    //   await sendEmail({
    //     to: [session.studentId.email, session.tutorId.email],
    //     subject: 'Session Reminder - Tomorrow',
    //     template: 'session-reminder-24h',
    //     data: { session },
    //   });
    // }

    // for (const session of sessionsIn1Hour) {
    //   await sendEmail({
    //     to: [session.studentId.email, session.tutorId.email],
    //     subject: 'Session Starting Soon',
    //     template: 'session-reminder-1h',
    //     data: { session },
    //   });
    // }

    if (sessionsIn24Hours.length > 0) {
      logger.info(`Sent 24-hour reminders for ${sessionsIn24Hours.length} sessions`);
    }

    if (sessionsIn1Hour.length > 0) {
      logger.info(`Sent 1-hour reminders for ${sessionsIn1Hour.length} sessions`);
    }
  } catch (error) {
    errorLogger.error('Failed to send session reminders', { error });
  }
};

/**
 * Generate monthly billings (1st of every month at 2:00 AM)
 */
export const generateMonthlyBillings = async () => {
  try {
    const now = new Date();
    const lastMonth = now.getMonth(); // 0-11
    const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = lastMonth === 0 ? 12 : lastMonth;

    const result = await MonthlyBillingService.generateMonthlyBillings(month, year);

    logger.info(`Generated ${result.length} monthly billings for ${year}-${month}`);
  } catch (error) {
    errorLogger.error('Failed to generate monthly billings', { error });
  }
};

/**
 * Generate tutor earnings (1st of every month at 3:00 AM)
 */
export const generateTutorEarnings = async () => {
  try {
    const now = new Date();
    const lastMonth = now.getMonth(); // 0-11
    const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = lastMonth === 0 ? 12 : lastMonth;

    const result = await TutorEarningsService.generateTutorEarnings(month, year, 0.2);

    logger.info(`Generated ${result.length} tutor earnings for ${year}-${month}`);
  } catch (error) {
    errorLogger.error('Failed to generate tutor earnings', { error });
  }
};

/**
 * Cleanup expired available interview slots
 * Runs daily at midnight (00:00)
 * Deletes all AVAILABLE slots where the day has passed
 * Booked/completed/cancelled slots are kept for records
 */
export const cleanupExpiredInterviewSlots = async () => {
  try {
    const deletedCount = await InterviewSlotService.cleanupExpiredAvailableSlots();

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired available interview slots`);
    }
  } catch (error) {
    errorLogger.error('Failed to cleanup expired interview slots', { error });
  }
};

/**
 * Initialize all cron jobs
 */
export const initializeCronJobs = () => {
  // Expire trial requests - Every hour
  cron.schedule('0 * * * *', () => {
    logger.info('Running cron: Expire trial requests');
    expireTrialRequests();
  });

  // Auto-transition sessions with attendance tracking
  // TEST_MODE: Every 1 minute (for testing 5 min sessions)
  // PRODUCTION: Every 5 minutes
  const sessionTransitionSchedule = TEST_MODE ? '* * * * *' : '*/5 * * * *';
  cron.schedule(sessionTransitionSchedule, () => {
    logger.info(`Running cron: Auto-transition sessions (TEST_MODE: ${TEST_MODE})`);
    autoTransitionSessions();
  });

  // Send session reminders - Every hour
  cron.schedule('0 * * * *', () => {
    logger.info('Running cron: Send session reminders');
    sendSessionReminders();
  });

  // Generate monthly billings - 1st of month at 2:00 AM
  cron.schedule('0 2 1 * *', () => {
    logger.info('Running cron: Generate monthly billings');
    generateMonthlyBillings();
  });

  // Generate tutor earnings - 1st of month at 3:00 AM
  cron.schedule('0 3 1 * *', () => {
    logger.info('Running cron: Generate tutor earnings');
    generateTutorEarnings();
  });

  // Cleanup expired available interview slots - Daily at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    logger.info('Running cron: Cleanup expired interview slots');
    cleanupExpiredInterviewSlots();
  });

  logger.info(`✅ Cron jobs initialized (TEST_MODE: ${TEST_MODE})`);
  if (TEST_MODE) {
    logger.info('🧪 TEST MODE: Session auto-transition runs every 1 minute');
  }
};

export const CronService = {
  initializeCronJobs,
  expireTrialRequests,
  autoCompleteSessions,
  autoTransitionSessions,
  sendSessionReminders,
  generateMonthlyBillings,
  generateTutorEarnings,
  cleanupExpiredInterviewSlots,
};
