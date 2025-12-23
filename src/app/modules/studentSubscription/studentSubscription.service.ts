import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import {
  IStudentSubscription,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIER,
} from './studentSubscription.interface';
import { StudentSubscription } from './studentSubscription.model';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Subscribe to a plan (Student)
 */
const subscribeToPlan = async (
  studentId: string,
  tier: SUBSCRIPTION_TIER
): Promise<IStudentSubscription> => {
  // Verify student
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can subscribe to plans');
  }

  // Check if student already has active subscription
  const activeSubscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (activeSubscription) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an active subscription. Please cancel it first to change plans.'
    );
  }

  // Create subscription
  const subscription = await StudentSubscription.create({
    studentId: new Types.ObjectId(studentId),
    tier,
    startDate: new Date(),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // Update user's subscription tier
  await User.findByIdAndUpdate(studentId, {
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
};

/**
 * Get student's active subscription
 */
const getMySubscription = async (studentId: string): Promise<IStudentSubscription | null> => {
  const subscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No active subscription found');
  }

  return subscription;
};

/**
 * Get all subscriptions (Admin)
 */
const getAllSubscriptions = async (query: Record<string, unknown>) => {
  const subscriptionQuery = new QueryBuilder(
    StudentSubscription.find().populate('studentId', 'name email profilePicture'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await subscriptionQuery.modelQuery;
  const meta = await subscriptionQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single subscription
 */
const getSingleSubscription = async (id: string): Promise<IStudentSubscription | null> => {
  const subscription = await StudentSubscription.findById(id).populate(
    'studentId',
    'name email profilePicture phone'
  );

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
  }

  return subscription;
};

/**
 * Cancel subscription (Student)
 */
const cancelSubscription = async (
  subscriptionId: string,
  studentId: string,
  cancellationReason: string
): Promise<IStudentSubscription | null> => {
  const subscription = await StudentSubscription.findById(subscriptionId);

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
  }

  // Verify ownership
  if (subscription.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own subscription'
    );
  }

  // Can only cancel ACTIVE subscriptions
  if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel subscription with status: ${subscription.status}`
    );
  }

  // Update subscription
  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancellationReason = cancellationReason;
  subscription.cancelledAt = new Date();
  await subscription.save();

  // Update user's subscription tier to null
  await User.findByIdAndUpdate(studentId, {
    'studentProfile.subscriptionTier': null,
  });

  // TODO: Cancel Stripe subscription
  // if (subscription.stripeSubscriptionId) {
  //   await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  // }

  return subscription;
};

/**
 * Increment hours taken (Called when session completes)
 */
const incrementHoursTaken = async (
  studentId: string,
  hours: number
): Promise<void> => {
  const subscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (subscription) {
    subscription.totalHoursTaken += hours;
    await subscription.save();
  }
};

/**
 * Auto-expire subscriptions (Cron job)
 * Marks subscriptions as EXPIRED after endDate passes
 */
const expireOldSubscriptions = async (): Promise<number> => {
  const result = await StudentSubscription.updateMany(
    {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: { $lt: new Date() },
    },
    {
      $set: { status: SUBSCRIPTION_STATUS.EXPIRED },
    }
  );

  // Update users' subscription tier to null
  const expiredSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.EXPIRED,
    endDate: { $lt: new Date() },
  });

  for (const subscription of expiredSubscriptions) {
    await User.findByIdAndUpdate(subscription.studentId, {
      'studentProfile.subscriptionTier': null,
    });
  }

  return result.modifiedCount;
};

/**
 * Get plan usage details (Student)
 * Returns comprehensive usage data for student's subscription
 */
type PlanUsageResponse = {
  // Plan details
  plan: {
    name: SUBSCRIPTION_TIER | null;
    pricePerHour: number;
    commitmentMonths: number;
    minimumHours: number;
    status: SUBSCRIPTION_STATUS | null;
    startDate: Date | null;
    endDate: Date | null;
  };
  // Usage stats
  usage: {
    hoursUsed: number;
    sessionsCompleted: number;
    hoursRemaining: number | null; // null for FLEXIBLE plan (no minimum)
    sessionsRemaining: number | null; // For plans with minimum hours
  };
  // Spending
  spending: {
    currentMonthSpending: number;
    totalSpending: number;
    bufferCharges: number; // Extra time charges
  };
  // Upcoming
  upcoming: {
    scheduledSessions: number;
    upcomingHours: number;
  };
};

const getMyPlanUsage = async (studentId: string): Promise<PlanUsageResponse> => {
  // Get active subscription
  const subscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // Get current month dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get completed sessions for current month
  const currentMonthSessions = await Session.find({
    studentId: new Types.ObjectId(studentId),
    status: SESSION_STATUS.COMPLETED,
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
  const allCompletedSessions = await Session.aggregate([
    {
      $match: {
        studentId: new Types.ObjectId(studentId),
        status: SESSION_STATUS.COMPLETED,
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
  const upcomingSessions = await Session.aggregate([
    {
      $match: {
        studentId: new Types.ObjectId(studentId),
        status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON] },
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
  let hoursRemaining: number | null = null;
  let sessionsRemaining: number | null = null;

  if (subscription.tier !== SUBSCRIPTION_TIER.FLEXIBLE) {
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
};

export const StudentSubscriptionService = {
  subscribeToPlan,
  getMySubscription,
  getAllSubscriptions,
  getSingleSubscription,
  cancelSubscription,
  incrementHoursTaken,
  expireOldSubscriptions,
  getMyPlanUsage,
};
