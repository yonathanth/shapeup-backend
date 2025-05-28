const express = require("express");
const {
  getCardData,
  getPieChartData,
  getPendingMembers,
  getAttendanceData,
  getNotifications,
  markNotificationsAsRead,
} = require("../controllers/dashboardController"); // Update with the correct path to your controller file
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticate, authorize(["admin", "root", "moderator"]));

router.get("/cardData", getCardData);
router.get("/pieChartData", getPieChartData);
router.get("/pendingMembers", getPendingMembers);
router.get("/attendanceData", getAttendanceData);
router.get("/notifications", getNotifications);
router.post("/notifications/mark-read", markNotificationsAsRead);

module.exports = router;
