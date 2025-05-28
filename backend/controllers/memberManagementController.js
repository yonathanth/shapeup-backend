const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bwipjs = require("bwip-js");

const generateBarcode = async (userId) => {
  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128", // Barcode type
      text: userId, // Text to encode
      scale: 2, // Scale factor (larger value makes it less compact)
      height: 20, // Height of the bars in the barcode
      includetext: true, // Include human-readable text
      textxalign: "center", // Center the text
      textsize: 12, // Size of the included text
    });
    return `data:image/png;base64,${barcodeBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Barcode generation error:", error);
    throw new Error("Failed to generate barcode");
  }
};

// Helper function to calculate days between two dates
const calculateDaysBetween = (date1, date2) =>
  Math.ceil((date2 - date1) / (1000 * 3600 * 24));

// Helper function to adjust start date for frozen duration
const adjustStartDateForFreeze = (preFreezeDaysCount) => {
  const adjustedStartDate = new Date();
  adjustedStartDate.setDate(adjustedStartDate.getDate() - preFreezeDaysCount);
  return adjustedStartDate;
};

// Helper function to calculate countdown
const calculateCountdown = (expirationDate, remainingDays) => {
  const today = new Date();
  const daysUntilExpiration = calculateDaysBetween(today, expirationDate);
  return Math.min(daysUntilExpiration, remainingDays);
};

const calculateDaysLeft = async (
  service,
  startDate,
  preFreezeAttendance,
  id
) => {
  const expirationDate = new Date(startDate);
  expirationDate.setDate(expirationDate.getDate() + service.period);

  const attendanceCountSinceStart = await prisma.attendance.count({
    where: { memberId: id, date: { gte: startDate } },
  });

  const remainingDays = service.maxDays - attendanceCountSinceStart;

  return calculateCountdown(expirationDate, remainingDays);
};

// Fetch user with attendance, service, and profile picture details
const fetchUserWithDetails = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch user details.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      exercisesCompleted: true,
      workouts: true,
      mealPlans: true,
      notifications: true,
      bmis: true,
      attendance: true,
      service: {
        select: {
          name: true,
          period: true,
          maxDays: true,
        },
      },
      healthCondition: true, // Include health condition if needed
    },
  });

  if (user && user.bmis) {
    user.bmis.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  return user;
};

// Get user profile with attendance details, countdown, profile picture, and status check
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await fetchUserWithDetails(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  if (!user.service) {
    return res.status(404).json({
      success: false,
      message: "User is not subscribed to any service",
    });
  }

  const { startDate, service, preFreezeAttendance, status } = user;

  // Return user details immediately for statuses other than active or expired
  if (status !== "active" && status !== "expired") {
    const barcode = await generateBarcode(user.id); // Generate barcode
    return res.status(200).json({
      success: true,
      data: { ...user, barcode },
    });
  }
  const countdown = await calculateDaysLeft(
    service,
    startDate,
    preFreezeAttendance,
    id
  );

  // Update countdown and auto-deactivate status if countdown is below zero
  await prisma.user.update({
    where: { id: id },
    data: {
      daysLeft: countdown,
      ...(countdown < -3
        ? { status: "inactive" }
        : countdown < 0
        ? { status: "expired" }
        : {}),
    },
  });

  // Generate barcode for the user
  const barcode = await generateBarcode(user.id);

  res.status(200).json({
    success: true,
    data: { ...user, barcode },
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, startDate, freezeDuration } = req.body;

  // Validate status
  if (
    ![
      "active",
      "inactive",
      "frozen",
      "pending",
      "unfreeze",
      "dormant",
    ].includes(status)
  ) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  // Fetch user with relevant fields
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      service: true,
      daysLeft: true,
      startDate: true,
      freezeDate: true,
      preFreezeAttendance: true,
      preFreezeDaysCount: true,
    },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const { daysLeft, service, preFreezeAttendance } = user; // Fetch daysLeft from user data

  // Initialize update data
  const updateData = { status };

  if (status === "active") {
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    if (isNaN(parsedStartDate.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid start date" });
    }

    // Calculate the adjusted start date if daysLeft is below zero
    if (daysLeft < 0) {
      const adjustedStartDate = new Date();
      adjustedStartDate.setDate(adjustedStartDate.getDate() + daysLeft); // Adjust start date by adding the negative days
      updateData.startDate = adjustedStartDate;
    } else {
      updateData.startDate = parsedStartDate;
    }

    // Reset other relevant fields
    const countdown = await calculateDaysLeft(
      service,
      updateData.startDate,
      0,
      id
    );
    updateData.daysLeft = countdown;
    updateData.freezeDate = null;
    updateData.preFreezeAttendance = 0;
    updateData.preFreezeDaysCount = 0;
  } else if (status === "unfreeze") {
    if (!user.freezeDate) {
      return res
        .status(400)
        .json({ success: false, message: "User is not currently frozen" });
    }

    // Adjust startDate by frozen duration using the calculateDaysBetween function
    updateData.freezeDuration = 0;
    updateData.startDate = adjustStartDateForFreeze(user.preFreezeDaysCount);
    updateData.freezeDate = null;
    updateData.status = "active";
  } else if (status === "frozen") {
    const attendanceCountSinceStart = await prisma.attendance.count({
      where: { memberId: id, date: { gte: user.startDate } },
    });

    // Use the calculateDaysBetween function to calculate the days since the startDate
    const daysSinceStart = calculateDaysBetween(user.startDate, new Date());
    updateData.freezeDuration = freezeDuration;
    updateData.freezeDate = new Date();
    updateData.preFreezeAttendance = attendanceCountSinceStart;
    updateData.preFreezeDaysCount = daysSinceStart;
  }

  // Update user

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    message: `User status updated successfully`,
    data: updatedUser,
  });
});

const renewUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }
  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      daysLeft: 0,
      preFreezeAttendance: 0,
      preFreezeDaysCount: 0,
      startDate: new Date(),
      status: "pending",
      freezeDate: null,
    },
  });

  res.status(200).json({
    success: true,
    message: "User updated successfully.",
    data: updatedUser,
  });
});
module.exports = { getUserProfile, updateUserStatus, renewUser };
