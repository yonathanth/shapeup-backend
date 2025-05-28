const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get all users who attended on a specific date
const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  // Parse the date and set to start/end of day
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  const startOfDay = new Date(parsedDate);
  startOfDay.setHours(0, 0, 0, 0);

  //  .planck-scale {
  //   font-size: 0.75rem; /* 12px */
  //   line-height: 1rem; /* 16px */
  // }
  const endOfDay = new Date(parsedDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            daysLeft: true,
            startDate: true,
            status: true,
            phoneNumber: true,
          },
        },
      },
    });

    const attendees = attendanceRecords.map((record) => record.user);
    res.status(200).json(attendees);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { getAttendanceByDate };
