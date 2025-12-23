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
exports.AdminService = void 0;
const mongoose_1 = require("mongoose");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const tutorApplication_model_1 = require("../tutorApplication/tutorApplication.model");
const tutorApplication_interface_1 = require("../tutorApplication/tutorApplication.interface");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const monthlyBilling_model_1 = require("../monthlyBilling/monthlyBilling.model");
const monthlyBilling_interface_1 = require("../monthlyBilling/monthlyBilling.interface");
const tutorEarnings_model_1 = require("../tutorEarnings/tutorEarnings.model");
const studentSubscription_model_1 = require("../studentSubscription/studentSubscription.model");
const studentSubscription_interface_1 = require("../studentSubscription/studentSubscription.interface");
const AggregationBuilder_1 = __importDefault(require("../../builder/AggregationBuilder"));
/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // User Statistics
    const [totalUsers, totalStudents, totalTutors, totalApplicants, newUsersThisMonth, activeStudentsCount, activeTutorsCount,] = yield Promise.all([
        user_model_1.User.countDocuments(),
        user_model_1.User.countDocuments({ role: user_1.USER_ROLES.STUDENT }),
        user_model_1.User.countDocuments({ role: user_1.USER_ROLES.TUTOR }),
        user_model_1.User.countDocuments({ role: user_1.USER_ROLES.APPLICANT }),
        user_model_1.User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
        studentSubscription_model_1.StudentSubscription.countDocuments({ status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE }),
        session_model_1.Session.distinct('tutorId', {
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        }).then(ids => ids.length),
    ]);
    // Application Statistics
    const [totalApplications, pendingApplications, approvedApplications, rejectedApplications, applicationsThisMonth,] = yield Promise.all([
        tutorApplication_model_1.TutorApplication.countDocuments(),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.APPROVED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REJECTED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    ]);
    // Session Statistics
    const [totalSessions, completedSessions, upcomingSessions, cancelledSessions, sessionsThisMonth,] = yield Promise.all([
        session_model_1.Session.countDocuments(),
        session_model_1.Session.countDocuments({ status: session_interface_1.SESSION_STATUS.COMPLETED }),
        session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.SCHEDULED,
            startTime: { $gte: now },
        }),
        session_model_1.Session.countDocuments({ status: session_interface_1.SESSION_STATUS.CANCELLED }),
        session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        }),
    ]);
    // Total hours this month
    const sessionsThisMonthData = yield session_model_1.Session.find({
        status: session_interface_1.SESSION_STATUS.COMPLETED,
        completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const totalHoursThisMonth = sessionsThisMonthData.reduce((sum, session) => sum + session.duration / 60, 0);
    // Financial Statistics
    const [allBillings, billingsThisMonth, pendingBillingsCount] = yield Promise.all([
        monthlyBilling_model_1.MonthlyBilling.find({ status: monthlyBilling_interface_1.BILLING_STATUS.PAID }),
        monthlyBilling_model_1.MonthlyBilling.find({
            status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
            paidAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        }),
        monthlyBilling_model_1.MonthlyBilling.countDocuments({ status: monthlyBilling_interface_1.BILLING_STATUS.PENDING }),
    ]);
    const totalRevenue = allBillings.reduce((sum, billing) => sum + billing.total, 0);
    const revenueThisMonth = billingsThisMonth.reduce((sum, billing) => sum + billing.total, 0);
    // Last month revenue
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const billingsLastMonth = yield monthlyBilling_model_1.MonthlyBilling.find({
        status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
        paidAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
    });
    const revenueLastMonth = billingsLastMonth.reduce((sum, billing) => sum + billing.total, 0);
    // Platform commission
    const allEarnings = yield tutorEarnings_model_1.TutorEarnings.find({});
    const totalPlatformCommission = allEarnings.reduce((sum, earning) => sum + earning.platformCommission, 0);
    const earningsThisMonth = yield tutorEarnings_model_1.TutorEarnings.find({
        payoutMonth: now.getMonth() + 1,
        payoutYear: now.getFullYear(),
    });
    const platformCommissionThisMonth = earningsThisMonth.reduce((sum, earning) => sum + earning.platformCommission, 0);
    // Subscription Statistics
    const activeSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    const flexiblePlanCount = activeSubscriptions.filter(sub => sub.tier === 'FLEXIBLE').length;
    const regularPlanCount = activeSubscriptions.filter(sub => sub.tier === 'REGULAR').length;
    const longTermPlanCount = activeSubscriptions.filter(sub => sub.tier === 'LONG_TERM').length;
    // Recent Activity (last 30 days)
    const [newStudents, newTutors, newApplications, recentCompletedSessions] = yield Promise.all([
        user_model_1.User.countDocuments({
            role: user_1.USER_ROLES.STUDENT,
            createdAt: { $gte: thirtyDaysAgo },
        }),
        user_model_1.User.countDocuments({
            role: user_1.USER_ROLES.TUTOR,
            createdAt: { $gte: thirtyDaysAgo },
        }),
        tutorApplication_model_1.TutorApplication.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.COMPLETED,
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
});
/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = (year, months) => __awaiter(void 0, void 0, void 0, function* () {
    const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const stats = [];
    for (const month of targetMonths) {
        const billings = yield monthlyBilling_model_1.MonthlyBilling.find({
            billingYear: year,
            billingMonth: month,
            status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
        });
        const earnings = yield tutorEarnings_model_1.TutorEarnings.find({
            payoutYear: year,
            payoutMonth: month,
        });
        const sessions = yield session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59),
            },
        });
        const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);
        const totalCommission = earnings.reduce((sum, earning) => sum + earning.platformCommission, 0);
        const totalPayouts = earnings.reduce((sum, earning) => sum + earning.netEarnings, 0);
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
});
/**
 * Get popular subjects by session count
 */
const getPopularSubjects = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10) {
    const result = yield session_model_1.Session.aggregate([
        { $match: { status: session_interface_1.SESSION_STATUS.COMPLETED } },
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
});
/**
 * Get top tutors by session count or earnings
 */
const getTopTutors = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10, sortBy = 'sessions') {
    if (sortBy === 'sessions') {
        const result = yield session_model_1.Session.aggregate([
            { $match: { status: session_interface_1.SESSION_STATUS.COMPLETED } },
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
    }
    else {
        const result = yield tutorEarnings_model_1.TutorEarnings.aggregate([
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
});
/**
 * Get top students by spending or sessions
 */
const getTopStudents = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10, sortBy = 'spending') {
    if (sortBy === 'spending') {
        const result = yield monthlyBilling_model_1.MonthlyBilling.aggregate([
            { $match: { status: monthlyBilling_interface_1.BILLING_STATUS.PAID } },
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
    }
    else {
        const result = yield session_model_1.Session.aggregate([
            { $match: { status: session_interface_1.SESSION_STATUS.COMPLETED } },
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
});
/**
 * Get user growth statistics (monthly new users)
 */
const getUserGrowth = (year, months) => __awaiter(void 0, void 0, void 0, function* () {
    const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const stats = [];
    for (const month of targetMonths) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const [totalUsers, students, tutors, applicants] = yield Promise.all([
            user_model_1.User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            user_model_1.User.countDocuments({
                role: user_1.USER_ROLES.STUDENT,
                createdAt: { $gte: startDate, $lte: endDate },
            }),
            user_model_1.User.countDocuments({
                role: user_1.USER_ROLES.TUTOR,
                createdAt: { $gte: startDate, $lte: endDate },
            }),
            user_model_1.User.countDocuments({
                role: user_1.USER_ROLES.APPLICANT,
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
});
/**
 * Get overview stats with percentage changes
 * Returns Total Revenue, Total Students, Total Tutors with growth metrics
 */
const getOverviewStats = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (period = 'month') {
    const [revenue, students, tutors] = yield Promise.all([
        // Revenue from MonthlyBilling (sum of 'total' field)
        new AggregationBuilder_1.default(monthlyBilling_model_1.MonthlyBilling).calculateGrowth({
            sumField: 'total',
            filter: { status: monthlyBilling_interface_1.BILLING_STATUS.PAID },
            period,
        }),
        // Students count
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            filter: { role: user_1.USER_ROLES.STUDENT },
            period,
        }),
        // Tutors count
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            filter: { role: user_1.USER_ROLES.TUTOR },
            period,
        }),
    ]);
    return { revenue, students, tutors };
});
/**
 * Get monthly revenue with advanced filters
 */
const getMonthlyRevenue = (year, months, filters) => __awaiter(void 0, void 0, void 0, function* () {
    const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const stats = [];
    for (const month of targetMonths) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // Build session filter
        const sessionFilter = {
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: startDate, $lte: endDate },
        };
        if (filters === null || filters === void 0 ? void 0 : filters.tutorId) {
            sessionFilter.tutorId = new mongoose_1.Types.ObjectId(filters.tutorId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.studentId) {
            sessionFilter.studentId = new mongoose_1.Types.ObjectId(filters.studentId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.subject) {
            sessionFilter.subject = filters.subject;
        }
        // Get sessions with filters
        const sessions = yield session_model_1.Session.find(sessionFilter);
        // Calculate session stats
        const sessionCount = sessions.length;
        const totalHours = sessions.reduce((sum, s) => sum + s.duration / 60, 0);
        const sessionRevenue = sessions.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        const averageSessionPrice = sessionCount > 0 ? sessionRevenue / sessionCount : 0;
        // Build billing filter
        const billingFilter = {
            billingYear: year,
            billingMonth: month,
            status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
        };
        if (filters === null || filters === void 0 ? void 0 : filters.studentId) {
            billingFilter.studentId = new mongoose_1.Types.ObjectId(filters.studentId);
        }
        // Get billings with tier filter if needed
        let billings = yield monthlyBilling_model_1.MonthlyBilling.find(billingFilter).populate('studentId');
        // Filter by subscription tier if provided
        if (filters === null || filters === void 0 ? void 0 : filters.subscriptionTier) {
            const studentsWithTier = yield studentSubscription_model_1.StudentSubscription.find({
                tier: filters.subscriptionTier,
                status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
            }).distinct('studentId');
            billings = billings.filter(billing => studentsWithTier.some(studentId => { var _a; return studentId.toString() === ((_a = billing.studentId) === null || _a === void 0 ? void 0 : _a.toString()); }));
        }
        const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);
        // Get earnings for commission/payout calculation
        const earningsFilter = {
            payoutYear: year,
            payoutMonth: month,
        };
        if (filters === null || filters === void 0 ? void 0 : filters.tutorId) {
            earningsFilter.tutorId = new mongoose_1.Types.ObjectId(filters.tutorId);
        }
        const earnings = yield tutorEarnings_model_1.TutorEarnings.find(earningsFilter);
        const totalCommission = earnings.reduce((sum, earning) => sum + earning.platformCommission, 0);
        const totalPayouts = earnings.reduce((sum, earning) => sum + earning.netEarnings, 0);
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
});
/**
 * Get user distribution by role and/or status
 */
const getUserDistribution = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (groupBy = 'role') {
    const total = yield user_model_1.User.countDocuments();
    const result = { total };
    if (groupBy === 'role' || groupBy === 'both') {
        const byRole = yield user_model_1.User.aggregate([
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
        const byStatus = yield user_model_1.User.aggregate([
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
});
exports.AdminService = {
    getDashboardStats,
    getRevenueByMonth,
    getPopularSubjects,
    getTopTutors,
    getTopStudents,
    getUserGrowth,
    getOverviewStats,
    getMonthlyRevenue,
    getUserDistribution,
};
