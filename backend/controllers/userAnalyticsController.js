const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get user registration analytics by time period
const getUserAnalytics = async (req, res) => {
  try {
    const { period } = req.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case "day":
        // Last 24 hours
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        // Last 7 days
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        // Last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3months":
        // Last 90 days (approximately 3 months)
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6months":
        // Last 180 days (approximately 6 months)
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        // Last 365 days
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        // Default to last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get new users count for the specified period
    const newUsersCount = await prisma.user.count({
      where: {
        firstRegisteredAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Get detailed user data for the period
    const newUsers = await prisma.user.findMany({
      where: {
        firstRegisteredAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        firstRegisteredAt: true,
        status: true,
        role: true,
      },
      orderBy: {
        firstRegisteredAt: "desc",
      },
    });

    // Get daily breakdown for charts (last 30 days max)
    const chartStartDate =
      period === "year"
        ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
        : new Date(
            Math.max(
              startDate.getTime(),
              now.getTime() - 30 * 24 * 60 * 60 * 1000
            )
          );

    const dailyBreakdown = await prisma.$queryRaw`
            SELECT 
                DATE(firstRegisteredAt) as date,
                COUNT(*) as count
            FROM User 
            WHERE firstRegisteredAt >= ${chartStartDate}
            AND firstRegisteredAt <= ${now}
            GROUP BY DATE(firstRegisteredAt)
            ORDER BY date ASC
        `;

    // Convert BigInt to number for JSON serialization
    const serializedDailyBreakdown = dailyBreakdown.map((item) => ({
      ...item,
      count: Number(item.count),
    }));

    return res.status(200).json({
      data: {
        period,
        startDate,
        endDate: now,
        totalNewUsers: newUsersCount,
        newUsers,
        dailyBreakdown: serializedDailyBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Get overall user statistics
const getOverallStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { status: "active" },
    });
    const pendingUsers = await prisma.user.count({
      where: { status: "pending" },
    });

    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        id: true,
      },
    });

    // Get monthly registrations for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStats = await prisma.$queryRaw`
            SELECT 
                YEAR(firstRegisteredAt) as year,
                MONTH(firstRegisteredAt) as month,
                COUNT(*) as count
            FROM User 
            WHERE firstRegisteredAt >= ${twelveMonthsAgo}
            GROUP BY YEAR(firstRegisteredAt), MONTH(firstRegisteredAt)
            ORDER BY year ASC, month ASC
        `;

    // Convert BigInt to number for JSON serialization
    const serializedMonthlyStats = monthlyStats.map((item) => ({
      ...item,
      year: Number(item.year),
      month: Number(item.month),
      count: Number(item.count),
    }));

    return res.status(200).json({
      data: {
        totalUsers,
        activeUsers,
        pendingUsers,
        usersByRole,
        monthlyStats: serializedMonthlyStats,
      },
    });
  } catch (error) {
    console.error("Error fetching overall stats:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  getUserAnalytics,
  getOverallStats,
};
