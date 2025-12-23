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
exports.StudentSubscriptionService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const studentSubscription_interface_1 = require("./studentSubscription.interface");
const studentSubscription_model_1 = require("./studentSubscription.model");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
/**
 * Subscribe to a plan (Student)
 */
const subscribeToPlan = (studentId, tier) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify student
    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can subscribe to plans');
    }
    // Check if student already has active subscription
    const activeSubscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (activeSubscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have an active subscription. Please cancel it first to change plans.');
    }
    // Create subscription
    const subscription = yield studentSubscription_model_1.StudentSubscription.create({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        tier,
        startDate: new Date(),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    // Update user's subscription tier
    yield user_model_1.User.findByIdAndUpdate(studentId, {
        'studentProfile.subscriptionTier': tier,
    });
    // TODO: Create Stripe customer and subscription
    // if (!student.stripeCustomerId) {
    //   const customer = await stripe.customers.create({
    //     email: student.email,
    //     name: student.name,
    //     metadata: { userId: studentId }
    //   });
    //   subscription.stripeCustomerId = customer.id;
    //   await subscription.save();
    // }
    return subscription;
});
/**
 * Get student's active subscription
 */
const getMySubscription = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'No active subscription found');
    }
    return subscription;
});
/**
 * Get all subscriptions (Admin)
 */
const getAllSubscriptions = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const subscriptionQuery = new QueryBuilder_1.default(studentSubscription_model_1.StudentSubscription.find().populate('studentId', 'name email profilePicture'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield subscriptionQuery.modelQuery;
    const meta = yield subscriptionQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single subscription
 */
const getSingleSubscription = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findById(id).populate('studentId', 'name email profilePicture phone');
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subscription not found');
    }
    return subscription;
});
/**
 * Cancel subscription (Student)
 */
const cancelSubscription = (subscriptionId, studentId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findById(subscriptionId);
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subscription not found');
    }
    // Verify ownership
    if (subscription.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own subscription');
    }
    // Can only cancel ACTIVE subscriptions
    if (subscription.status !== studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot cancel subscription with status: ${subscription.status}`);
    }
    // Update subscription
    subscription.status = studentSubscription_interface_1.SUBSCRIPTION_STATUS.CANCELLED;
    subscription.cancellationReason = cancellationReason;
    subscription.cancelledAt = new Date();
    yield subscription.save();
    // Update user's subscription tier to null
    yield user_model_1.User.findByIdAndUpdate(studentId, {
        'studentProfile.subscriptionTier': null,
    });
    // TODO: Cancel Stripe subscription
    // if (subscription.stripeSubscriptionId) {
    //   await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    // }
    return subscription;
});
/**
 * Increment hours taken (Called when session completes)
 */
const incrementHoursTaken = (studentId, hours) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (subscription) {
        subscription.totalHoursTaken += hours;
        yield subscription.save();
    }
});
/**
 * Auto-expire subscriptions (Cron job)
 * Marks subscriptions as EXPIRED after endDate passes
 */
const expireOldSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield studentSubscription_model_1.StudentSubscription.updateMany({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
        endDate: { $lt: new Date() },
    }, {
        $set: { status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.EXPIRED },
    });
    // Update users' subscription tier to null
    const expiredSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.EXPIRED,
        endDate: { $lt: new Date() },
    });
    for (const subscription of expiredSubscriptions) {
        yield user_model_1.User.findByIdAndUpdate(subscription.studentId, {
            'studentProfile.subscriptionTier': null,
        });
    }
    return result.modifiedCount;
});
const getMyPlanUsage = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    // Get active subscription
    const subscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    // Get current month dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    // Get completed sessions for current month
    const currentMonthSessions = yield session_model_1.Session.find({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: session_interface_1.SESSION_STATUS.COMPLETED,
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
    });
    // Calculate current month spending
    let currentMonthSpending = 0;
    let bufferCharges = 0;
    for (const session of currentMonthSessions) {
        currentMonthSpending += session.totalPrice || 0;
        bufferCharges += session.bufferPrice || 0;
    }
    // Get all completed sessions for total stats
    const allCompletedSessions = yield session_model_1.Session.aggregate([
        {
            $match: {
                studentId: new mongoose_1.Types.ObjectId(studentId),
                status: session_interface_1.SESSION_STATUS.COMPLETED,
            },
        },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalHours: { $sum: { $divide: ['$duration', 60] } },
                totalSpending: { $sum: '$totalPrice' },
                totalBufferCharges: { $sum: '$bufferPrice' },
            },
        },
    ]);
    const stats = allCompletedSessions[0] || {
        totalSessions: 0,
        totalHours: 0,
        totalSpending: 0,
        totalBufferCharges: 0,
    };
    // Get upcoming scheduled sessions
    const upcomingSessions = yield session_model_1.Session.aggregate([
        {
            $match: {
                studentId: new mongoose_1.Types.ObjectId(studentId),
                status: { $in: [session_interface_1.SESSION_STATUS.SCHEDULED, session_interface_1.SESSION_STATUS.STARTING_SOON] },
                startTime: { $gte: now },
            },
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                totalHours: { $sum: { $divide: ['$duration', 60] } },
            },
        },
    ]);
    const upcomingStats = upcomingSessions[0] || { count: 0, totalHours: 0 };
    // Build response based on subscription status
    if (!subscription) {
        // No active subscription
        return {
            plan: {
                name: null,
                pricePerHour: 30, // Default FLEXIBLE rate
                commitmentMonths: 0,
                minimumHours: 0,
                status: null,
                startDate: null,
                endDate: null,
            },
            usage: {
                hoursUsed: stats.totalHours,
                sessionsCompleted: stats.totalSessions,
                hoursRemaining: null,
                sessionsRemaining: null,
            },
            spending: {
                currentMonthSpending,
                totalSpending: stats.totalSpending,
                bufferCharges: stats.totalBufferCharges,
            },
            upcoming: {
                scheduledSessions: upcomingStats.count,
                upcomingHours: upcomingStats.totalHours,
            },
        };
    }
    // Calculate remaining hours (only for REGULAR and LONG_TERM)
    let hoursRemaining = null;
    let sessionsRemaining = null;
    if (subscription.tier !== studentSubscription_interface_1.SUBSCRIPTION_TIER.FLEXIBLE) {
        hoursRemaining = Math.max(0, subscription.minimumHours - subscription.totalHoursTaken);
        // Assuming 1 hour per session
        sessionsRemaining = Math.ceil(hoursRemaining);
    }
    return {
        plan: {
            name: subscription.tier,
            pricePerHour: subscription.pricePerHour,
            commitmentMonths: subscription.commitmentMonths,
            minimumHours: subscription.minimumHours,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
        },
        usage: {
            hoursUsed: subscription.totalHoursTaken,
            sessionsCompleted: stats.totalSessions,
            hoursRemaining,
            sessionsRemaining,
        },
        spending: {
            currentMonthSpending,
            totalSpending: stats.totalSpending,
            bufferCharges: stats.totalBufferCharges,
        },
        upcoming: {
            scheduledSessions: upcomingStats.count,
            upcomingHours: upcomingStats.totalHours,
        },
    };
});
exports.StudentSubscriptionService = {
    subscribeToPlan,
    getMySubscription,
    getAllSubscriptions,
    getSingleSubscription,
    cancelSubscription,
    incrementHoursTaken,
    expireOldSubscriptions,
    getMyPlanUsage,
};
