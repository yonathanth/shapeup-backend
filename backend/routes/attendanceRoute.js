const express = require("express");
const router = express.Router();
const { recordAttendance } = require("../controllers/atttendanceController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate, authorize(["admin", "moderator", "root"]));

router.post("/:id", recordAttendance);

module.exports = router;
