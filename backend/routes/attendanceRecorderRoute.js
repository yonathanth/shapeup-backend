const express = require("express");
const router = express.Router();
const { getAttendanceByDate } = require("../controllers/attendanceRecorder");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate, authorize(["admin", "moderator", "root"]));

// Route to get users who attended on a specific date
router.get("/", getAttendanceByDate);

module.exports = router;
