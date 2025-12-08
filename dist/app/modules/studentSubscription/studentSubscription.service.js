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
    const meta = yield subscriptionQuery.countTotal();
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
exports.StudentSubscriptionService = {
    subscribeToPlan,
    getMySubscription,
    getAllSubscriptions,
    getSingleSubscription,
    cancelSubscription,
    incrementHoursTaken,
    expireOldSubscriptions,
};
