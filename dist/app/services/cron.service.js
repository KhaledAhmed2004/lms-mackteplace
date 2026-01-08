"use strict";
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
exports.CronService = exports.initializeCronJobs = exports.generateTutorEarnings = exports.generateMonthlyBillings = exports.sendSessionReminders = exports.autoCompleteSessions = exports.autoTransitionSessions = exports.expireTrialRequests = void 0;
const logger_1 = require("../../shared/logger");
const node_cron_1 = __importDefault(require("node-cron"));
// ============================================
// 🧪 TEST MODE CONFIGURATION
// ============================================
// Set to true for testing - runs session transition every 1 minute
// Set to false for production - runs every 5 minutes
const TEST_MODE = true;
// ============================================
// Import services
const monthlyBilling_service_1 = require("../modules/monthlyBilling/monthlyBilling.service");
const tutorEarnings_service_1 = require("../modules/tutorEarnings/tutorEarnings.service");
const session_service_1 = require("../modules/session/session.service");
const trialRequest_model_1 = require("../modules/trialRequest/trialRequest.model");
const trialRequest_interface_1 = require("../modules/trialRequest/trialRequest.interface");
const session_model_1 = require("../modules/session/session.model");
const session_interface_1 = require("../modules/session/session.interface");
/**
 * Auto-expire trial requests after 24 hours
 * Runs every hour
 */
const expireTrialRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const expiredRequests = yield trialRequest_model_1.TrialRequest.updateMany({
            status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
            expiresAt: { $lte: now },
        }, {
            $set: { status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.EXPIRED },
        });
        if (expiredRequests.modifiedCount > 0) {
            logger_1.logger.info(`Expired ${expiredRequests.modifiedCount} trial requests`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to expire trial requests', { error });
    }
});
exports.expireTrialRequests = expireTrialRequests;
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
const autoTransitionSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield session_service_1.SessionService.autoTransitionSessionStatuses();
        const totalChanges = result.startingSoon + result.inProgress + result.completed + result.noShow + result.expired;
        if (totalChanges > 0) {
            logger_1.logger.info(`Session auto-transition: ${result.startingSoon} starting soon, ${result.inProgress} in progress, ${result.completed} completed, ${result.noShow} no-show, ${result.expired} expired`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to auto-transition sessions', { error });
    }
});
exports.autoTransitionSessions = autoTransitionSessions;
/**
 * @deprecated Use autoTransitionSessions instead
 * Keeping for backward compatibility
 */
const autoCompleteSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, exports.autoTransitionSessions)();
});
exports.autoCompleteSessions = autoCompleteSessions;
/**
 * Send session reminders
 * Runs every hour
 */
const sendSessionReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        // Find sessions starting in 24 hours
        const sessionsIn24Hours = yield session_model_1.Session.find({
            status: session_interface_1.SESSION_STATUS.SCHEDULED,
            startTime: {
                $gte: twentyFourHoursLater,
                $lte: new Date(twentyFourHoursLater.getTime() + 60 * 60 * 1000), // 1-hour window
            },
        })
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');
        // Find sessions starting in 1 hour
        const sessionsIn1Hour = yield session_model_1.Session.find({
            status: session_interface_1.SESSION_STATUS.SCHEDULED,
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
            logger_1.logger.info(`Sent 24-hour reminders for ${sessionsIn24Hours.length} sessions`);
        }
        if (sessionsIn1Hour.length > 0) {
            logger_1.logger.info(`Sent 1-hour reminders for ${sessionsIn1Hour.length} sessions`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to send session reminders', { error });
    }
});
exports.sendSessionReminders = sendSessionReminders;
/**
 * Generate monthly billings (1st of every month at 2:00 AM)
 */
const generateMonthlyBillings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const lastMonth = now.getMonth(); // 0-11
        const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = lastMonth === 0 ? 12 : lastMonth;
        const result = yield monthlyBilling_service_1.MonthlyBillingService.generateMonthlyBillings(month, year);
        logger_1.logger.info(`Generated ${result.length} monthly billings for ${year}-${month}`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to generate monthly billings', { error });
    }
});
exports.generateMonthlyBillings = generateMonthlyBillings;
/**
 * Generate tutor earnings (1st of every month at 3:00 AM)
 */
const generateTutorEarnings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const lastMonth = now.getMonth(); // 0-11
        const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = lastMonth === 0 ? 12 : lastMonth;
        const result = yield tutorEarnings_service_1.TutorEarningsService.generateTutorEarnings(month, year, 0.2);
        logger_1.logger.info(`Generated ${result.length} tutor earnings for ${year}-${month}`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to generate tutor earnings', { error });
    }
});
exports.generateTutorEarnings = generateTutorEarnings;
/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    // Expire trial requests - Every hour
    node_cron_1.default.schedule('0 * * * *', () => {
        logger_1.logger.info('Running cron: Expire trial requests');
        (0, exports.expireTrialRequests)();
    });
    // Auto-transition sessions with attendance tracking
    // TEST_MODE: Every 1 minute (for testing 5 min sessions)
    // PRODUCTION: Every 5 minutes
    const sessionTransitionSchedule = TEST_MODE ? '* * * * *' : '*/5 * * * *';
    node_cron_1.default.schedule(sessionTransitionSchedule, () => {
        logger_1.logger.info(`Running cron: Auto-transition sessions (TEST_MODE: ${TEST_MODE})`);
        (0, exports.autoTransitionSessions)();
    });
    // Send session reminders - Every hour
    node_cron_1.default.schedule('0 * * * *', () => {
        logger_1.logger.info('Running cron: Send session reminders');
        (0, exports.sendSessionReminders)();
    });
    // Generate monthly billings - 1st of month at 2:00 AM
    node_cron_1.default.schedule('0 2 1 * *', () => {
        logger_1.logger.info('Running cron: Generate monthly billings');
        (0, exports.generateMonthlyBillings)();
    });
    // Generate tutor earnings - 1st of month at 3:00 AM
    node_cron_1.default.schedule('0 3 1 * *', () => {
        logger_1.logger.info('Running cron: Generate tutor earnings');
        (0, exports.generateTutorEarnings)();
    });
    logger_1.logger.info(`✅ Cron jobs initialized (TEST_MODE: ${TEST_MODE})`);
    if (TEST_MODE) {
        logger_1.logger.info('🧪 TEST MODE: Session auto-transition runs every 1 minute');
    }
};
exports.initializeCronJobs = initializeCronJobs;
exports.CronService = {
    initializeCronJobs: exports.initializeCronJobs,
    expireTrialRequests: exports.expireTrialRequests,
    autoCompleteSessions: exports.autoCompleteSessions,
    autoTransitionSessions: exports.autoTransitionSessions,
    sendSessionReminders: exports.sendSessionReminders,
    generateMonthlyBillings: exports.generateMonthlyBillings,
    generateTutorEarnings: exports.generateTutorEarnings,
};
