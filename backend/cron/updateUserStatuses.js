const cron = require("node-cron");
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

// Adjust start date after freeze period ends
const adjustStartDateForFreeze = (preFreezeDaysCount) => {
  const adjustedStartDate = new Date();
  adjustedStartDate.setDate(adjustedStartDate.getDate() - preFreezeDaysCount);
  return adjustedStartDate;
};

// Cron job to update user statusess
const updateUserStatuses = async () => {
  try {
    console.log("Starting user status update...");

    const users = await prisma.user.findMany({
      where: {
        status: { in: ["active", "expired", "frozen"] },
      },
      include: {
        service: true,
      },
    });

    const updates = users.map(async (user) => {
      const {
        id,
        fullName,
        startDate,
        service,
        preFreezeAttendance,
        status,
        freezeDuration,
        freezeDate,
        preFreezeDaysCount,
      } = user;

      if (!service) {
        console.warn(`User ${id} has no active service. Skipping.`);
        return;
      }

      const updateData = {};
      const today = new Date();

      // Handle frozen users
      if (status === "frozen" && freezeDate) {
        const freezeEndDate = new Date(freezeDate);
        freezeEndDate.setDate(freezeEndDate.getDate() + freezeDuration);

        if (today >= freezeEndDate) {
          updateData.freezeDuration = 0;
          updateData.startDate = adjustStartDateForFreeze(preFreezeDaysCount);
          updateData.freezeDate = null;
          updateData.status = "active";
          console.log(
            `User ${fullName} freeze period ended. Status set to active.`
          );
        }
        console.log(`User ${fullName} freeze period has not ended yet.`);
      }

      const expirationDate = new Date(startDate);
      expirationDate.setDate(expirationDate.getDate() + service.period);

      const attendanceCountSinceStart = await prisma.attendance.count({
        where: { memberId: id, date: { gte: startDate } },
      });

      const remainingDays = service.maxDays - attendanceCountSinceStart;
      const countdown = calculateCountdown(expirationDate, remainingDays);

      if (status !== "frozen") {
        updateData.daysLeft = countdown;
        const newStatus =
          countdown < -3 ? "inactive" : countdown < 0 ? "expired" : status;

        // Create notification if status changes to expired or inactive
        if (
          newStatus !== status &&
          (newStatus === "expired" || newStatus === "inactive")
        ) {
          await prisma.notification.create({
            data: {
              userId: id,
              name: "Membership Status Update",
              description: `${fullName}'s membership has been marked as ${newStatus}.`,
            },
          });
        }

        updateData.status = newStatus;
      }

      await prisma.user.update({
        where: { id: id },
        data: updateData,
      });

      console.log(
        `User ${fullName} updated: Countdown = ${countdown}, Status = ${
          updateData.status || status
        }`
      );
    });

    await Promise.all(updates);
    console.log("User status update completed.");
  } catch (error) {
    console.error("Error updating user statuses:", error);
  }
};

// Schedule the cron job to run daily at midnight
cron.schedule("0 0 * * *", updateUserStatuses);

module.exports = updateUserStatuses;
