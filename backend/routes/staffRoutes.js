const express = require("express");
const router = express.Router();
const { getStaff, updateStaff } = require("../controllers/staffController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all staff members (admin only)
router.get("/", authorize(["admin", "root"]), getStaff);

// Update staff member (admin only)
router.put("/:id", authorize(["admin", "root"]), updateStaff);

module.exports = router;
