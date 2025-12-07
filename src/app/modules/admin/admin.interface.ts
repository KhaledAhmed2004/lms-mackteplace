export type IDashboardStats = {
  // User Statistics
  users: {
    totalUsers: number;
    totalStudents: number;
    totalTutors: number;
    totalApplicants: number;
    newUsersThisMonth: number;
    activeStudents: number; // Students with active subscriptions
    activeTutors: number; // Tutors with sessions this month
  };

  // Application Statistics
  applications: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    applicationsThisMonth: number;
  };

  // Session Statistics
  sessions: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    cancelledSessions: number;
    sessionsThisMonth: number;
    totalHoursThisMonth: number;
  };

  // Financial Statistics
  revenue: {
    totalRevenue: number; // All-time
    revenueThisMonth: number;
    revenueLastMonth: number;
    pendingBillings: number;
    totalPlatformCommission: number; // All-time
    platformCommissionThisMonth: number;
  };

  // Subscription Statistics
  subscriptions: {
    totalActiveSubscriptions: number;
    flexiblePlanCount: number;
    regularPlanCount: number;
    longTermPlanCount: number;
  };

  // Recent Activity (last 30 days)
  recentActivity: {
    newStudents: number;
    newTutors: number;
    newApplications: number;
    completedSessions: number;
  };
};

export type IRevenueStats = {
  month: number;
  year: number;
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  netProfit: number;
  sessionCount: number;
};

export type IPopularSubject = {
  subject: string;
  sessionCount: number;
  totalRevenue: number;
  averageRating?: number;
};

export type ITopTutor = {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  totalSessions: number;
  totalEarnings: number;
  averageRating?: number;
  subjects: string[];
};

export type ITopStudent = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalSessions: number;
  totalSpent: number;
  subscriptionTier: string;
};
