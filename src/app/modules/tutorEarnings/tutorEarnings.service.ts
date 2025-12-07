import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { TutorEarnings } from './tutorEarnings.model';
import { IEarningLineItem, ITutorEarnings, PAYOUT_STATUS } from './tutorEarnings.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import QueryBuilder from '../../builder/QueryBuilder';

/**
 * Generate tutor earnings for all tutors (called at month-end after billing)
 */
const generateTutorEarnings = async (
  month: number,
  year: number,
  commissionRate: number = 0.2
): Promise<ITutorEarnings[]> => {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  // Get all active tutors
  const tutors = await User.find({ role: USER_ROLES.TUTOR });

  const earnings: ITutorEarnings[] = [];

  for (const tutor of tutors) {
    // Check if payout already exists
    const existingPayout = await TutorEarnings.findOne({
      tutorId: tutor._id,
      payoutMonth: month,
      payoutYear: year,
    });

    if (existingPayout) {
      continue; // Skip if already generated
    }

    // Get completed sessions for this tutor in billing period
    const sessions = await Session.find({
      tutorId: tutor._id,
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: periodStart, $lte: periodEnd },
    }).populate('studentId', 'name');

    if (sessions.length === 0) {
      continue; // Skip tutors with no sessions
    }

    // Build line items
    const lineItems: IEarningLineItem[] = sessions.map(session => ({
      sessionId: session._id as Types.ObjectId,
      studentName: (session.studentId as any).name,
      subject: session.subject,
      completedAt: session.completedAt!,
      duration: session.duration,
      sessionPrice: session.totalPrice,
      tutorEarning: session.totalPrice * (1 - commissionRate),
    }));

    // Create earnings record
    const earning = await TutorEarnings.create({
      tutorId: tutor._id,
      payoutMonth: month,
      payoutYear: year,
      periodStart,
      periodEnd,
      lineItems,
      commissionRate,
      status: PAYOUT_STATUS.PENDING,
    });

    earnings.push(earning);
  }

  return earnings;
};

/**
 * Get tutor's earnings history
 */
const getMyEarnings = async (tutorId: string, query: Record<string, unknown>) => {
  const earningsQuery = new QueryBuilder(
    TutorEarnings.find({ tutorId }),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await earningsQuery.modelQuery;
  const meta = await earningsQuery.countTotal();

  return { data: result, meta };
};

/**
 * Get all earnings (Admin)
 */
const getAllEarnings = async (query: Record<string, unknown>) => {
  const earningsQuery = new QueryBuilder(
    TutorEarnings.find().populate('tutorId', 'name email'),
    query
  )
    .search(['payoutReference'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await earningsQuery.modelQuery;
  const meta = await earningsQuery.countTotal();

  return { data: result, meta };
};

/**
 * Get single earnings record
 */
const getSingleEarning = async (id: string): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id)
    .populate('tutorId', 'name email')
    .populate('lineItems.sessionId');

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  return earning;
};

/**
 * Initiate payout to tutor (Stripe Connect transfer)
 */
const initiatePayout = async (
  id: string,
  payload: { notes?: string }
): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id).populate('tutorId');

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  if (earning.status !== PAYOUT_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot initiate payout. Current status: ${earning.status}`
    );
  }

  if (earning.netEarnings <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot initiate payout with zero or negative earnings'
    );
  }

  // TODO: Integrate Stripe Connect transfer
  // const tutor = earning.tutorId as any;
  // const transfer = await stripe.transfers.create({
  //   amount: Math.round(earning.netEarnings * 100), // Convert to cents
  //   currency: 'eur',
  //   destination: tutor.stripeConnectAccountId,
  //   transfer_group: earning.payoutReference,
  //   metadata: {
  //     tutorId: tutor._id.toString(),
  //     payoutMonth: earning.payoutMonth,
  //     payoutYear: earning.payoutYear,
  //   },
  // });

  // earning.stripeTransferId = transfer.id;
  earning.status = PAYOUT_STATUS.PROCESSING;
  if (payload.notes) {
    earning.notes = payload.notes;
  }

  await earning.save();

  return earning;
};

/**
 * Mark payout as completed (Called by Stripe webhook or manual)
 */
const markAsPaid = async (
  id: string,
  payload: {
    stripePayoutId?: string;
    paymentMethod?: string;
  }
): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id);

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  earning.status = PAYOUT_STATUS.PAID;
  earning.paidAt = new Date();

  if (payload.stripePayoutId) {
    earning.stripePayoutId = payload.stripePayoutId;
  }

  if (payload.paymentMethod) {
    earning.paymentMethod = payload.paymentMethod;
  }

  await earning.save();

  // TODO: Send email notification to tutor
  // await sendEmail({
  //   to: tutor.email,
  //   subject: 'Payout Completed',
  //   template: 'payout-completed',
  //   data: { earning },
  // });

  return earning;
};

/**
 * Mark payout as failed
 */
const markAsFailed = async (
  id: string,
  failureReason: string
): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id);

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  earning.status = PAYOUT_STATUS.FAILED;
  earning.failureReason = failureReason;

  await earning.save();

  // TODO: Send email notification to tutor
  // await sendEmail({
  //   to: tutor.email,
  //   subject: 'Payout Failed',
  //   template: 'payout-failed',
  //   data: { earning, failureReason },
  // });

  return earning;
};

export const TutorEarningsService = {
  generateTutorEarnings,
  getMyEarnings,
  getAllEarnings,
  getSingleEarning,
  initiatePayout,
  markAsPaid,
  markAsFailed,
};
