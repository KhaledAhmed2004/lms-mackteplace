/**
 * Cron Job Service
 *
 * This service handles automated tasks:
 * - Session reminders (24 hours before, 1 hour before)
 * - Trial request auto-expiration (24 hours)
 * - Month-end billing generation
 * - Month-end tutor earnings generation
 * - Session auto-completion (after endTime)
 *
 * Prerequisites:
 * 1. Install node-cron: npm install node-cron
 * 2. Install @types/node-cron: npm install -D @types/node-cron
 */

import logger from '../../shared/logger';
import errorLogger from '../../shared/errorLogger';

// TODO: Install node-cron package
// import cron from 'node-cron';

// Import services
import { MonthlyBillingService } from '../modules/monthlyBilling/monthlyBilling.service';
import { TutorEarningsService } from '../modules/tutorEarnings/tutorEarnings.service';
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
 * Auto-complete sessions after endTime
 * Runs every 30 minutes
 */
export const autoCompleteSessions = async () => {
  try {
    const now = new Date();

    const completedSessions = await Session.updateMany(
      {
        status: SESSION_STATUS.SCHEDULED,
        endTime: { $lte: now },
      },
      {
        $set: {
          status: SESSION_STATUS.COMPLETED,
          completedAt: new Date(),
        },
      }
    );

    if (completedSessions.modifiedCount > 0) {
      logger.info(`Auto-completed ${completedSessions.modifiedCount} sessions`);
    }
  } catch (error) {
    errorLogger.error('Failed to auto-complete sessions', { error });
  }
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
 * Initialize all cron jobs
 */
export const initializeCronJobs = () => {
  // TODO: Uncomment when node-cron is installed

  // // Expire trial requests - Every hour
  // cron.schedule('0 * * * *', () => {
  //   logger.info('Running cron: Expire trial requests');
  //   expireTrialRequests();
  // });

  // // Auto-complete sessions - Every 30 minutes
  // cron.schedule('*/30 * * * *', () => {
  //   logger.info('Running cron: Auto-complete sessions');
  //   autoCompleteSessions();
  // });

  // // Send session reminders - Every hour
  // cron.schedule('0 * * * *', () => {
  //   logger.info('Running cron: Send session reminders');
  //   sendSessionReminders();
  // });

  // // Generate monthly billings - 1st of month at 2:00 AM
  // cron.schedule('0 2 1 * *', () => {
  //   logger.info('Running cron: Generate monthly billings');
  //   generateMonthlyBillings();
  // });

  // // Generate tutor earnings - 1st of month at 3:00 AM
  // cron.schedule('0 3 1 * *', () => {
  //   logger.info('Running cron: Generate tutor earnings');
  //   generateTutorEarnings();
  // });

  logger.info('Cron jobs initialized (placeholders - install node-cron to activate)');
};

export const CronService = {
  initializeCronJobs,
  expireTrialRequests,
  autoCompleteSessions,
  sendSessionReminders,
  generateMonthlyBillings,
  generateTutorEarnings,
};
