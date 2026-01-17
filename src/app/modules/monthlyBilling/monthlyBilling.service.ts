import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Session } from '../session/session.model';
import { StudentSubscription } from '../studentSubscription/studentSubscription.model';
import { SESSION_STATUS, COMPLETION_STATUS } from '../session/session.interface';
import { SUBSCRIPTION_STATUS } from '../studentSubscription/studentSubscription.interface';
import {
  IMonthlyBilling,
  BILLING_STATUS,
  IBillingLineItem,
} from './monthlyBilling.interface';
import { MonthlyBilling } from './monthlyBilling.model';
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Generate monthly billing for all active students
 * Called by cron job at month-end
 */
const generateMonthlyBillings = async (
  month: number,
  year: number
): Promise<IMonthlyBilling[]> => {
  // Get period dates
  const periodStart = new Date(year, month - 1, 1); // First day of month
  const periodEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month

  // Find all active subscriptions
  const activeSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
  }).populate('studentId');

  const billings: IMonthlyBilling[] = [];

  for (const subscription of activeSubscriptions) {
    try {
      // Check if billing already exists
      const existingBilling = await MonthlyBilling.findOne({
        studentId: subscription.studentId,
        billingMonth: month,
        billingYear: year,
      });

      if (existingBilling) {
        continue; // Skip if already billed
      }

      // Get completed sessions for this student in billing period
      // NEW: Query by studentCompletionStatus instead of main status
      const sessions = await Session.find({
        studentId: subscription.studentId,
        studentCompletionStatus: COMPLETION_STATUS.COMPLETED,
        studentCompletedAt: {
          $gte: periodStart,
          $lte: periodEnd,
        },
      }).populate('tutorId', 'name');

      if (sessions.length === 0) {
        continue; // Skip if no sessions
      }

      // Build line items - use studentCompletedAt for date
      const lineItems: IBillingLineItem[] = sessions.map(session => ({
        sessionId: session._id as Types.ObjectId,
        subject: session.subject,
        tutorName: (session.tutorId as any).name,
        date: session.studentCompletedAt || session.completedAt!,
        duration: session.duration,
        pricePerHour: session.pricePerHour,
        amount: session.totalPrice,
      }));

      // Create billing
      const billing = await MonthlyBilling.create({
        studentId: subscription.studentId,
        subscriptionId: subscription._id,
        billingMonth: month,
        billingYear: year,
        periodStart,
        periodEnd,
        lineItems,
        subscriptionTier: subscription.tier,
        pricePerHour: subscription.pricePerHour,
        status: BILLING_STATUS.PENDING,
      });

      billings.push(billing);

      // TODO: Create Stripe invoice
      // const student = subscription.studentId as any;
      // if (subscription.stripeCustomerId) {
      //   const invoice = await stripe.invoices.create({
      //     customer: subscription.stripeCustomerId,
      //     auto_advance: false,
      //     description: `Tutoring sessions for ${month}/${year}`,
      //     metadata: {
      //       billingId: billing._id.toString(),
      //       studentId: student._id.toString()
      //     }
      //   });
      //
      //   billing.stripeInvoiceId = invoice.id;
      //   await billing.save();
      // }

      // TODO: Send invoice email
      // await sendEmail({
      //   to: student.email,
      //   subject: `Your Invoice for ${month}/${year}`,
      //   template: 'monthly-invoice',
      //   data: { billing, student }
      // });
    } catch (error: any) {
      // Log error but continue with other billings
      console.error(
        `Error generating billing for student ${subscription.studentId}:`,
        error.message
      );
    }
  }

  return billings;
};

/**
 * Get student's billing history
 */
const getMyBillings = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const billingQuery = new QueryBuilder(
    MonthlyBilling.find({ studentId: new Types.ObjectId(studentId) }),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await billingQuery.modelQuery;
  const meta = await billingQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get all billings (Admin)
 */
const getAllBillings = async (query: Record<string, unknown>) => {
  const billingQuery = new QueryBuilder(
    MonthlyBilling.find().populate('studentId', 'name email profilePicture'),
    query
  )
    .search(['invoiceNumber'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await billingQuery.modelQuery;
  const meta = await billingQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single billing
 */
const getSingleBilling = async (id: string): Promise<IMonthlyBilling | null> => {
  const billing = await MonthlyBilling.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('subscriptionId');

  if (!billing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found');
  }

  return billing;
};

/**
 * Mark billing as paid (Webhook handler or manual)
 */
const markAsPaid = async (
  billingId: string,
  paymentDetails?: {
    stripePaymentIntentId?: string;
    paymentMethod?: string;
  }
): Promise<IMonthlyBilling | null> => {
  const billing = await MonthlyBilling.findById(billingId);

  if (!billing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found');
  }

  if (billing.status === BILLING_STATUS.PAID) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Billing is already paid');
  }

  billing.status = BILLING_STATUS.PAID;
  billing.paidAt = new Date();

  if (paymentDetails) {
    billing.stripePaymentIntentId = paymentDetails.stripePaymentIntentId;
    billing.paymentMethod = paymentDetails.paymentMethod;
  }

  await billing.save();

  // TODO: Send payment confirmation email
  // await sendEmail({
  //   to: student.email,
  //   subject: 'Payment Received',
  //   template: 'payment-confirmation',
  //   data: { billing }
  // });

  return billing;
};

/**
 * Mark billing as failed
 */
const markAsFailed = async (
  billingId: string,
  failureReason: string
): Promise<IMonthlyBilling | null> => {
  const billing = await MonthlyBilling.findById(billingId);

  if (!billing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found');
  }

  billing.status = BILLING_STATUS.FAILED;
  billing.failureReason = failureReason;
  await billing.save();

  // TODO: Send payment failure email
  // await sendEmail({
  //   to: student.email,
  //   subject: 'Payment Failed',
  //   template: 'payment-failed',
  //   data: { billing, failureReason }
  // });

  return billing;
};

export const MonthlyBillingService = {
  generateMonthlyBillings,
  getMyBillings,
  getAllBillings,
  getSingleBilling,
  markAsPaid,
  markAsFailed,
};
