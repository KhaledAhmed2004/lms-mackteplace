import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';
import { APPLICATION_STATUS } from '../tutorApplication/tutorApplication.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS, PAYMENT_STATUS } from '../session/session.interface';
import { MonthlyBilling } from '../monthlyBilling/monthlyBilling.model';
import { BILLING_STATUS } from '../monthlyBilling/monthlyBilling.interface';
import { TutorEarnings } from '../tutorEarnings/tutorEarnings.model';
import { StudentSubscription } from '../studentSubscription/studentSubscription.model';
import { SUBSCRIPTION_STATUS } from '../studentSubscription/studentSubscription.interface';
import AggregationBuilder from '../../builder/AggregationBuilder';
import { TrialRequest } from '../trialRequest/trialRequest.model';
import { TRIAL_REQUEST_STATUS } from '../trialRequest/trialRequest.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import {
  IDashboardStats,
  IRevenueStats,
  IPopularSubject,
  ITopTutor,
  ITopStudent,
  IOverviewStats,
  IMonthlyRevenue,
  IUserDistribution,
  IUnifiedSession,
  IUnifiedSessionsQuery,
} from './admin.interface';

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = async (): Promise<IDashboardStats> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // User Statistics
  const [
    totalUsers,
    totalStudents,
    totalTutors,
    totalApplicants,
    newUsersThisMonth,
    activeStudentsCount,
    activeTutorsCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: USER_ROLES.STUDENT }),
    User.countDocuments({ role: USER_ROLES.TUTOR }),
    User.countDocuments({ role: USER_ROLES.APPLICANT }),
    User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    StudentSubscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE }),
    Session.distinct('tutorId', {
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    }).then(ids => ids.length),
  ]);

  // Application Statistics
  const [
    totalApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    applicationsThisMonth,
  ] = await Promise.all([
    TutorApplication.countDocuments(),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SUBMITTED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED }),
    TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
  ]);

  // Session Statistics
  const [
    totalSessions,
    completedSessions,
    upcomingSessions,
    cancelledSessions,
    sessionsThisMonth,
  ] = await Promise.all([
    Session.countDocuments(),
    Session.countDocuments({ status: SESSION_STATUS.COMPLETED }),
    Session.countDocuments({
      status: SESSION_STATUS.SCHEDULED,
      startTime: { $gte: now },
    }),
    Session.countDocuments({ status: SESSION_STATUS.CANCELLED }),
    Session.countDocuments({
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    }),
  ]);

  // Total hours this month
  const sessionsThisMonthData = await Session.find({
    status: SESSION_STATUS.COMPLETED,
    completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
  });
  const totalHoursThisMonth = sessionsThisMonthData.reduce(
    (sum, session) => sum + session.duration / 60,
    0
  );

  // Financial Statistics
  const [allBillings, billingsThisMonth, pendingBillingsCount] = await Promise.all([
    MonthlyBilling.find({ status: BILLING_STATUS.PAID }),
    MonthlyBilling.find({
      status: BILLING_STATUS.PAID,
      paidAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    }),
    MonthlyBilling.countDocuments({ status: BILLING_STATUS.PENDING }),
  ]);

  const totalRevenue = allBillings.reduce((sum, billing) => sum + billing.total, 0);
  const revenueThisMonth = billingsThisMonth.reduce(
    (sum, billing) => sum + billing.total,
    0
  );

  // Last month revenue
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const billingsLastMonth = await MonthlyBilling.find({
    status: BILLING_STATUS.PAID,
    paidAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
  });
  const revenueLastMonth = billingsLastMonth.reduce(
    (sum, billing) => sum + billing.total,
    0
  );

  // Platform commission
  const allEarnings = await TutorEarnings.find({});
  const totalPlatformCommission = allEarnings.reduce(
    (sum, earning) => sum + earning.platformCommission,
    0
  );

  const earningsThisMonth = await TutorEarnings.find({
    payoutMonth: now.getMonth() + 1,
    payoutYear: now.getFullYear(),
  });
  const platformCommissionThisMonth = earningsThisMonth.reduce(
    (sum, earning) => sum + earning.platformCommission,
    0
  );

  // Subscription Statistics
  const activeSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  const flexiblePlanCount = activeSubscriptions.filter(
    sub => sub.tier === 'FLEXIBLE'
  ).length;
  const regularPlanCount = activeSubscriptions.filter(
    sub => sub.tier === 'REGULAR'
  ).length;
  const longTermPlanCount = activeSubscriptions.filter(
    sub => sub.tier === 'LONG_TERM'
  ).length;

  // Recent Activity (last 30 days)
  const [newStudents, newTutors, newApplications, recentCompletedSessions] =
    await Promise.all([
      User.countDocuments({
        role: USER_ROLES.STUDENT,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      User.countDocuments({
        role: USER_ROLES.TUTOR,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      TutorApplication.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Session.countDocuments({
        status: SESSION_STATUS.COMPLETED,
        completedAt: { $gte: thirtyDaysAgo },
      }),
    ]);

  return {
    users: {
      totalUsers,
      totalStudents,
      totalTutors,
      totalApplicants,
      newUsersThisMonth,
      activeStudents: activeStudentsCount,
      activeTutors: activeTutorsCount,
    },
    applications: {
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      applicationsThisMonth,
    },
    sessions: {
      totalSessions,
      completedSessions,
      upcomingSessions,
      cancelledSessions,
      sessionsThisMonth,
      totalHoursThisMonth,
    },
    revenue: {
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      pendingBillings: pendingBillingsCount,
      totalPlatformCommission,
      platformCommissionThisMonth,
    },
    subscriptions: {
      totalActiveSubscriptions: activeSubscriptions.length,
      flexiblePlanCount,
      regularPlanCount,
      longTermPlanCount,
    },
    recentActivity: {
      newStudents,
      newTutors,
      newApplications,
      completedSessions: recentCompletedSessions,
    },
  };
};

/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = async (
  year: number,
  months?: number[]
): Promise<IRevenueStats[]> => {
  const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const stats: IRevenueStats[] = [];

  for (const month of targetMonths) {
    const billings = await MonthlyBilling.find({
      billingYear: year,
      billingMonth: month,
      status: BILLING_STATUS.PAID,
    });

    const earnings = await TutorEarnings.find({
      payoutYear: year,
      payoutMonth: month,
    });

    const sessions = await Session.countDocuments({
      status: SESSION_STATUS.COMPLETED,
      completedAt: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      },
    });

    const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);
    const totalCommission = earnings.reduce(
      (sum, earning) => sum + earning.platformCommission,
      0
    );
    const totalPayouts = earnings.reduce(
      (sum, earning) => sum + earning.netEarnings,
      0
    );

    stats.push({
      month,
      year,
      totalRevenue,
      totalCommission,
      totalPayouts,
      netProfit: totalCommission,
      sessionCount: sessions,
    });
  }

  return stats;
};

/**
 * Get popular subjects by session count
 */
const getPopularSubjects = async (limit: number = 10): Promise<IPopularSubject[]> => {
  const result = await Session.aggregate([
    { $match: { status: SESSION_STATUS.COMPLETED } },
    {
      $group: {
        _id: '$subject',
        sessionCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { sessionCount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        subject: '$_id',
        sessionCount: 1,
        totalRevenue: 1,
      },
    },
  ]);

  return result;
};

/**
 * Get top tutors by session count or earnings
 */
const getTopTutors = async (
  limit: number = 10,
  sortBy: 'sessions' | 'earnings' = 'sessions'
): Promise<ITopTutor[]> => {
  if (sortBy === 'sessions') {
    const result = await Session.aggregate([
      { $match: { status: SESSION_STATUS.COMPLETED } },
      {
        $group: {
          _id: '$tutorId',
          totalSessions: { $sum: 1 },
          totalEarnings: { $sum: '$totalPrice' },
          subjects: { $addToSet: '$subject' },
        },
      },
      { $sort: { totalSessions: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'tutor',
        },
      },
      { $unwind: '$tutor' },
      {
        $project: {
          _id: 0,
          tutorId: '$_id',
          tutorName: '$tutor.name',
          tutorEmail: '$tutor.email',
          totalSessions: 1,
          totalEarnings: 1,
          subjects: 1,
        },
      },
    ]);

    return result;
  } else {
    const result = await TutorEarnings.aggregate([
      {
        $group: {
          _id: '$tutorId',
          totalEarnings: { $sum: '$netEarnings' },
          totalSessions: { $sum: '$totalSessions' },
        },
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'tutor',
        },
      },
      { $unwind: '$tutor' },
      {
        $project: {
          _id: 0,
          tutorId: '$_id',
          tutorName: '$tutor.name',
          tutorEmail: '$tutor.email',
          totalSessions: 1,
          totalEarnings: 1,
          subjects: [],
        },
      },
    ]);

    return result;
  }
};

/**
 * Get top students by spending or sessions
 */
const getTopStudents = async (
  limit: number = 10,
  sortBy: 'spending' | 'sessions' = 'spending'
): Promise<ITopStudent[]> => {
  if (sortBy === 'spending') {
    const result = await MonthlyBilling.aggregate([
      { $match: { status: BILLING_STATUS.PAID } },
      {
        $group: {
          _id: '$studentId',
          totalSpent: { $sum: '$total' },
          totalSessions: { $sum: '$totalSessions' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'studentsubscriptions',
          localField: '_id',
          foreignField: 'studentId',
          as: 'subscription',
        },
      },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          studentName: '$student.name',
          studentEmail: '$student.email',
          totalSpent: 1,
          totalSessions: 1,
          subscriptionTier: {
            $ifNull: [{ $arrayElemAt: ['$subscription.tier', 0] }, 'N/A'],
          },
        },
      },
    ]);

    return result;
  } else {
    const result = await Session.aggregate([
      { $match: { status: SESSION_STATUS.COMPLETED } },
      {
        $group: {
          _id: '$studentId',
          totalSessions: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
        },
      },
      { $sort: { totalSessions: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'studentsubscriptions',
          localField: '_id',
          foreignField: 'studentId',
          as: 'subscription',
        },
      },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          studentName: '$student.name',
          studentEmail: '$student.email',
          totalSessions: 1,
          totalSpent: 1,
          subscriptionTier: {
            $ifNull: [{ $arrayElemAt: ['$subscription.tier', 0] }, 'N/A'],
          },
        },
      },
    ]);

    return result;
  }
};

/**
 * Get user growth statistics (monthly new users)
 */
const getUserGrowth = async (year: number, months?: number[]) => {
  const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const stats = [];

  for (const month of targetMonths) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [totalUsers, students, tutors, applicants] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({
        role: USER_ROLES.STUDENT,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      User.countDocuments({
        role: USER_ROLES.TUTOR,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      User.countDocuments({
        role: USER_ROLES.APPLICANT,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    stats.push({
      month,
      year,
      totalUsers,
      students,
      tutors,
      applicants,
    });
  }

  return stats;
};

/**
 * Get overview stats with percentage changes
 * Returns Total Revenue, Total Students, Total Tutors with growth metrics
 */
const getOverviewStats = async (
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<IOverviewStats> => {
  const [revenue, students, tutors] = await Promise.all([
    // Revenue from MonthlyBilling (sum of 'total' field)
    new AggregationBuilder(MonthlyBilling).calculateGrowth({
      sumField: 'total',
      filter: { status: BILLING_STATUS.PAID },
      period,
    }),
    // Students count
    new AggregationBuilder(User).calculateGrowth({
      filter: { role: USER_ROLES.STUDENT },
      period,
    }),
    // Tutors count
    new AggregationBuilder(User).calculateGrowth({
      filter: { role: USER_ROLES.TUTOR },
      period,
    }),
  ]);

  return { revenue, students, tutors };
};

/**
 * Get monthly revenue with advanced filters
 */
const getMonthlyRevenue = async (
  year: number,
  months?: number[],
  filters?: {
    tutorId?: string;
    studentId?: string;
    subscriptionTier?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
    subject?: string;
  }
): Promise<IMonthlyRevenue[]> => {
  const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const stats: IMonthlyRevenue[] = [];

  for (const month of targetMonths) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Build session filter
    const sessionFilter: Record<string, unknown> = {
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (filters?.tutorId) {
      sessionFilter.tutorId = new Types.ObjectId(filters.tutorId);
    }
    if (filters?.studentId) {
      sessionFilter.studentId = new Types.ObjectId(filters.studentId);
    }
    if (filters?.subject) {
      sessionFilter.subject = filters.subject;
    }

    // Get sessions with filters
    const sessions = await Session.find(sessionFilter);

    // Calculate session stats
    const sessionCount = sessions.length;
    const totalHours = sessions.reduce((sum, s) => sum + s.duration / 60, 0);
    const sessionRevenue = sessions.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const averageSessionPrice = sessionCount > 0 ? sessionRevenue / sessionCount : 0;

    // Build billing filter
    const billingFilter: Record<string, unknown> = {
      billingYear: year,
      billingMonth: month,
      status: BILLING_STATUS.PAID,
    };

    if (filters?.studentId) {
      billingFilter.studentId = new Types.ObjectId(filters.studentId);
    }

    // Get billings with tier filter if needed
    let billings = await MonthlyBilling.find(billingFilter).populate('studentId');

    // Filter by subscription tier if provided
    if (filters?.subscriptionTier) {
      const studentsWithTier = await StudentSubscription.find({
        tier: filters.subscriptionTier,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      }).distinct('studentId');

      billings = billings.filter(billing =>
        studentsWithTier.some(
          studentId => studentId.toString() === billing.studentId?.toString()
        )
      );
    }

    const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);

    // Get earnings for commission/payout calculation
    const earningsFilter: Record<string, unknown> = {
      payoutYear: year,
      payoutMonth: month,
    };

    if (filters?.tutorId) {
      earningsFilter.tutorId = new Types.ObjectId(filters.tutorId);
    }

    const earnings = await TutorEarnings.find(earningsFilter);

    const totalCommission = earnings.reduce(
      (sum, earning) => sum + earning.platformCommission,
      0
    );
    const totalPayouts = earnings.reduce(
      (sum, earning) => sum + earning.netEarnings,
      0
    );

    stats.push({
      month,
      year,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      totalPayouts: Math.round(totalPayouts * 100) / 100,
      netProfit: Math.round(totalCommission * 100) / 100,
      sessionCount,
      totalHours: Math.round(totalHours * 100) / 100,
      averageSessionPrice: Math.round(averageSessionPrice * 100) / 100,
    });
  }

  return stats;
};

/**
 * Get user distribution by role and/or status
 */
const getUserDistribution = async (
  groupBy: 'role' | 'status' | 'both' = 'role'
): Promise<IUserDistribution> => {
  const total = await User.countDocuments();

  const result: IUserDistribution = { total };

  if (groupBy === 'role' || groupBy === 'both') {
    const byRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          role: '$_id',
          count: 1,
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$count', total] }, 100] }, 2],
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
    result.byRole = byRole;
  }

  if (groupBy === 'status' || groupBy === 'both') {
    const byStatus = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$count', total] }, 100] }, 2],
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
    result.byStatus = byStatus;
  }

  return result;
};

/**
 * Get unified sessions (Sessions + Trial Requests)
 * Merges both sessions and pending trial requests into a single view
 */
const getUnifiedSessions = async (
  query: IUnifiedSessionsQuery
): Promise<{
  data: IUnifiedSession[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    isTrial,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Get all sessions with populated fields
  const sessions = await Session.find()
    .populate('studentId', 'name email phone profilePicture')
    .populate('tutorId', 'name email phone profilePicture')
    .lean();

  // Get pending/accepted trial requests (not yet converted to session or waiting)
  const pendingTrialRequests = await TrialRequest.find({
    status: { $in: [TRIAL_REQUEST_STATUS.PENDING, TRIAL_REQUEST_STATUS.ACCEPTED] },
  })
    .populate('studentId', 'name email phone profilePicture')
    .populate('acceptedTutorId', 'name email phone profilePicture')
    .populate('subject', 'name')
    .lean();

  // Transform sessions to unified format
  const unifiedSessions: IUnifiedSession[] = sessions.map((s: any) => ({
    _id: s._id.toString(),
    type: 'SESSION' as const,
    studentName: s.studentId?.name,
    studentEmail: s.studentId?.email,
    studentPhone: s.studentId?.phone,
    tutorName: s.tutorId?.name,
    tutorEmail: s.tutorId?.email,
    tutorPhone: s.tutorId?.phone,
    subject: s.subject,
    status: s.status,
    paymentStatus: s.isTrial ? 'FREE_TRIAL' : s.paymentStatus || PAYMENT_STATUS.PENDING,
    startTime: s.startTime,
    endTime: s.endTime,
    createdAt: s.createdAt,
    isTrial: s.isTrial || false,
    description: s.description,
    totalPrice: s.totalPrice,
  }));

  // Transform trial requests to unified format
  const unifiedTrialRequests: IUnifiedSession[] = pendingTrialRequests.map((tr: any) => ({
    _id: tr._id.toString(),
    type: 'TRIAL_REQUEST' as const,
    studentName: tr.studentInfo?.name || tr.studentId?.name,
    studentEmail: tr.studentInfo?.email || tr.studentInfo?.guardianInfo?.email || tr.studentId?.email,
    studentPhone: tr.studentInfo?.guardianInfo?.phone || tr.studentId?.phone,
    tutorName: tr.acceptedTutorId?.name || 'Pending Tutor',
    tutorEmail: tr.acceptedTutorId?.email,
    tutorPhone: tr.acceptedTutorId?.phone,
    subject: tr.subject?.name || 'Unknown Subject',
    status: tr.status,
    paymentStatus: 'FREE_TRIAL',
    startTime: tr.preferredDateTime,
    endTime: undefined,
    createdAt: tr.createdAt,
    isTrial: true,
    description: tr.description,
    totalPrice: 0,
  }));

  // Merge all items
  let unified = [...unifiedSessions, ...unifiedTrialRequests];

  // Apply filters
  if (status) {
    unified = unified.filter(item => item.status === status);
  }

  if (paymentStatus) {
    unified = unified.filter(item => item.paymentStatus === paymentStatus);
  }

  if (isTrial !== undefined) {
    unified = unified.filter(item => item.isTrial === isTrial);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    unified = unified.filter(
      item =>
        item.studentName?.toLowerCase().includes(searchLower) ||
        item.studentEmail?.toLowerCase().includes(searchLower) ||
        item.tutorName?.toLowerCase().includes(searchLower) ||
        item.subject?.toLowerCase().includes(searchLower)
    );
  }

  // Sort
  unified.sort((a, b) => {
    const aValue = a[sortBy as keyof IUnifiedSession];
    const bValue = b[sortBy as keyof IUnifiedSession];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortOrder === 'desc'
        ? bValue.getTime() - aValue.getTime()
        : aValue.getTime() - bValue.getTime();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'desc'
        ? bValue.localeCompare(aValue)
        : aValue.localeCompare(bValue);
    }

    return 0;
  });

  // Pagination
  const total = unified.length;
  const totalPage = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = unified.slice(startIndex, startIndex + limit);

  return {
    data: paginatedData,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

/**
 * Get session stats for admin dashboard
 */
const getSessionStats = async (): Promise<{
  totalSessions: number;
  pendingSessions: number;
  completedSessions: number;
  trialSessions: number;
}> => {
  const now = new Date();

  const [totalSessions, pendingSessions, completedSessions, trialSessions] =
    await Promise.all([
      Session.countDocuments(),
      Session.countDocuments({
        status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON] },
        startTime: { $gte: now },
      }),
      Session.countDocuments({ status: SESSION_STATUS.COMPLETED }),
      Session.countDocuments({ isTrial: true }),
    ]);

  return {
    totalSessions,
    pendingSessions,
    completedSessions,
    trialSessions,
  };
};

export const AdminService = {
  getDashboardStats,
  getRevenueByMonth,
  getPopularSubjects,
  getTopTutors,
  getTopStudents,
  getUserGrowth,
  getOverviewStats,
  getMonthlyRevenue,
  getUserDistribution,
  getUnifiedSessions,
  getSessionStats,
};
