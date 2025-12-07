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
  const meta = await subscriptionQuery.countTotal();

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

export const StudentSubscriptionService = {
  subscribeToPlan,
  getMySubscription,
  getAllSubscriptions,
  getSingleSubscription,
  cancelSubscription,
  incrementHoursTaken,
  expireOldSubscriptions,
};
