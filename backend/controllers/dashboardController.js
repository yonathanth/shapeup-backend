const express = require("express");
const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Helper function for card data (total members, employees, and new members)
const getCardData = asyncHandler(async (req, res) => {
  const totalMembersCount = await prisma.user.count({
    where: {
      role: "user",
    },
  });
  const totalEmployeesCount = await prisma.employee.count();
  const newMembersCount = await prisma.user.count({
    where: {
      status: "pending",
      role: "user",
    },
  });

  res.json({
    success: true,
    data: {
      totalMembers: totalMembersCount,
      totalEmployees: totalEmployeesCount,
      newMembers: newMembersCount,
    },
  });
});

// Helper function for pending members data
const getPendingMembers = asyncHandler(async (req, res) => {
  const pendingMembers = await prisma.user.findMany({
    where: { status: "pending", role: "user" },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      service: {
        select: {
          name: true,
        },
      },
      status: true,
    },
  });

  res.json({ success: true, data: pendingMembers });
});

const getPieChartData = asyncHandler(async (req, res) => {
  const { type = "membership" } = req.query;

  if (type === "membership") {
    // Fetch all service categories
    const allCategories = await prisma.service.findMany({
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    // Fetch user counts grouped by service category
    const categoryBreakdown = await prisma.user.groupBy({
      by: ["serviceId"],
      _count: {
        id: true,
      },
      where: {
        role: "user",
        service: {
          isNot: null,
        },
      },
    });

    // Fetch all services with their categories and IDs
    const services = await prisma.service.findMany({
      select: {
        id: true,
        category: true,
      },
    });

    // Map service IDs to categories and aggregate user counts
    const categoryCounts = services.reduce((acc, service) => {
      const serviceGroup = categoryBreakdown.find(
        (group) => group.serviceId === service.id
      );
      acc[service.category] =
        (acc[service.category] || 0) + (serviceGroup?._count.id || 0);
      return acc;
    }, {});

    // Include categories with zero counts
    const finalCounts = allCategories.reduce((acc, category) => {
      acc[category.category] = categoryCounts[category.category] || 0;
      return acc;
    }, {});

    // Format response
    const breakdown = Object.entries(finalCounts).map(
      ([category, memberCount]) => ({
        category,
        memberCount,
      })
    );

    res.status(200).json({
      success: true,
      data: {
        breakdown,
      },
    });
  } else if (type === "status") {
    // Get all possible statuses
    const statuses = [
      "active",
      "inactive",
      "dormant",
      "frozen",
      "expired",
      "pending",
    ];

    // Fetch user counts grouped by status
    const statusBreakdown = await prisma.user.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      where: {
        role: "user",
      },
    });

    // Create a map of status counts
    const statusCounts = statusBreakdown.reduce((acc, group) => {
      acc[group.status] = group._count.id;
      return acc;
    }, {});

    // Include all statuses with zero counts if they don't exist
    const finalCounts = statuses.reduce((acc, status) => {
      acc[status] = statusCounts[status] || 0;
      return acc;
    }, {});

    // Format response
    const breakdown = Object.entries(finalCounts).map(
      ([status, memberCount]) => ({
        category: status.charAt(0).toUpperCase() + status.slice(1),
        memberCount,
      })
    );

    res.status(200).json({
      success: true,
      data: {
        breakdown,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      message:
        "Invalid type parameter. Must be either 'membership' or 'status'",
    });
  }
});

const getAttendanceData = asyncHandler(async (req, res) => {
  // Set today to the current date at end of day in local time
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Helper function to get date at start of day
  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Weekly range (last 7 days including today)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  // Monthly range (last 30 days including today)
  const monthStart = new Date(today);
  monthStart.setDate(today.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);

  // Last 12 months range (including current month)
  const yearStart = new Date(today);
  yearStart.setMonth(today.getMonth() - 11);
  yearStart.setDate(1);
  yearStart.setHours(0, 0, 0, 0);

  // Get all attendance records once with a single query
  const allAttendance = await prisma.attendance.findMany({
    where: {
      createdAt: {
        gte: yearStart, // Get everything from the oldest range we need
        lte: today,
      },
    },
    select: {
      createdAt: true,
    },
  });

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split("T")[0];

  // Process weekly data
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = formatDate(date);

    const count = allAttendance.filter((a) => {
      const aDate = new Date(a.createdAt);
      return (
        aDate.getDate() === date.getDate() &&
        aDate.getMonth() === date.getMonth() &&
        aDate.getFullYear() === date.getFullYear()
      );
    }).length;

    return {
      date: dateStr,
      count,
    };
  });

  // Process monthly data (30 days)
  const monthlyData = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date(monthStart);
    date.setDate(monthStart.getDate() + i);
    const dateStr = formatDate(date);

    const count = allAttendance.filter((a) => {
      const aDate = new Date(a.createdAt);
      return (
        aDate.getDate() === date.getDate() &&
        aDate.getMonth() === date.getMonth() &&
        aDate.getFullYear() === date.getFullYear()
      );
    }).length;

    return {
      date: dateStr,
      count,
    };
  });

  // Process yearly data (12 months)
  const yearlyData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date(yearStart);
    date.setMonth(yearStart.getMonth() + i);
    const monthStartDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEndDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const count = allAttendance.filter((a) => {
      const aDate = new Date(a.createdAt);
      return aDate >= monthStartDate && aDate <= monthEndDate;
    }).length;

    return {
      month: date.toLocaleString("default", { month: "short" }),
      year: date.getFullYear(),
      count,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      weekly: weeklyData,
      monthly: monthlyData,
      yearly: yearlyData,
    },
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Get last 10 notifications
    });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
    });
  }
});

const markNotificationsAsRead = asyncHandler(async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
    });
  }
});

// Export all helper functions
module.exports = {
  getCardData,
  getPieChartData,
  getPendingMembers,
  getAttendanceData,
  getNotifications,
  markNotificationsAsRead,
};
