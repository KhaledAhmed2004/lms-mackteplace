import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';
import { APPLICATION_STATUS } from '../tutorApplication/tutorApplication.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import { MonthlyBilling } from '../monthlyBilling/monthlyBilling.model';
import { BILLING_STATUS } from '../monthlyBilling/monthlyBilling.interface';
import { TutorEarnings } from '../tutorEarnings/tutorEarnings.model';
import { StudentSubscription } from '../studentSubscription/studentSubscription.model';
import { SUBSCRIPTION_STATUS } from '../studentSubscription/studentSubscription.interface';
import {
  IDashboardStats,
  IRevenueStats,
  IPopularSubject,
  ITopTutor,
  ITopStudent,
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

export const AdminService = {
  getDashboardStats,
  getRevenueByMonth,
  getPopularSubjects,
  getTopTutors,
  getTopStudents,
  getUserGrowth,
};
