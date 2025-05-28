const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Helper function to calculate days between two dates
const calculateDaysBetween = (date1, date2) =>
  Math.ceil((date2 - date1) / (1000 * 3600 * 24));

// Helper function to calculate countdown
const calculateCountdown = (expirationDate, remainingDays) => {
  const today = new Date();
  const daysUntilExpiration = calculateDaysBetween(today, expirationDate);
  return Math.min(daysUntilExpiration, remainingDays);
};

// Fetch user with attendance, service
const fetchUserWithDetails = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch Member's details.");
  }
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      attendance: true,
      service: {
        select: {
          name: true,
          period: true,
          maxDays: true,
        },
      },
    },
  });
};

// Record attendance for a user and update countdown
const recordAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Create today's date at the start of the day in UTC
  // This ensures consistent date handling regardless of server timezone
  const now = new Date();
  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  // Check if attendance already exists for today
  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      memberId: id,
      date: {
        gte: today,
        lt: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0,
            0,
            0,
            0
          )
        ),
      },
    },
  });

  if (existingAttendance) {
    return res.status(400).json({
      success: false,
      message: "✅ Attendance already recorded for today",
    });
  }

  const user = await fetchUserWithDetails(id);

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "❌ Member not found",
    });
  }

  if (user.status === "frozen") {
    return res.status(400).json({
      success: false,
      message: `💠 ${user.fullName} is on Freeze. Please unfreeze them to record attendance.`,
    });
  }
  if (user.status === "inactive") {
    return res.status(400).json({
      success: false,
      message: `❌ ${user.fullName} is inactive. Please renew their membership before recording attendance.`,
    });
  }
  if (user.status === "pending") {
    return res.status(400).json({
      success: false,
      message: `❕${user.fullName} is not approved(pending). Please approve their membership before recording attendance.`,
    });
  }
  if (user.status === "dormant") {
    return res.status(400).json({
      success: false,
      message: `❌ ${user.fullName} is dormant. Please renew their membership before recording attendance.`,
    });
  }

  const { startDate, service, preFreezeAttendance, fullName } = user;
  const expirationDate = new Date(startDate);
  expirationDate.setDate(expirationDate.getDate() + service.period);

  const attendanceCountSinceStart = await prisma.attendance.count({
    where: { memberId: id, date: { gte: startDate } },
  });

  const remainingDays = service.maxDays - attendanceCountSinceStart;
  const daysLeft = calculateCountdown(expirationDate, remainingDays);

  // Check if remainingDays is below -3
  if (daysLeft < -3) {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "inactive" },
    });

    return res.status(400).json({
      success: false,
      message: `${fullName} is inactive!`,
    });
  }

  // Check if remainingDays is zero or less
  else if (daysLeft < 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "expired" },
    });
  }

  // Record attendance and decrement remainingDays
  await prisma.attendance.create({ data: { memberId: id, date: today } });

  // Recalculate remainingDays and daysLeft after attendance
  const newRemainingDays = service.maxDays - (attendanceCountSinceStart + 1);
  const daysLeftAfter = calculateCountdown(expirationDate, newRemainingDays);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      totalAttendance: { increment: 1 },
      daysLeft: daysLeftAfter,
    },
  });

  const message =
    updatedUser.status === "expired"
      ? `❗️ Attendance recorded but ${fullName}'s membership has expired. Please remind them to renew their membership.`
      : `✅ Attendance for ${fullName} recorded successfully`;

  res.status(201).json({
    success: true,
    message,
    data: {
      totalAttendance: updatedUser.totalAttendance,
      name: fullName,
    },
  });
});

module.exports = { recordAttendance };
