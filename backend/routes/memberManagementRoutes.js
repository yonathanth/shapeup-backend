const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  updateUserStatus,
  renewUser,
} = require("../controllers/memberManagementController");

// Protected routes: Only authenticated users can access these
router.get("/:id/profile", authenticate, getUserProfile);
router.put(
  "/:id/status",
  authenticate,
  authorize(["admin", "moderator", "root"]),
  updateUserStatus
);
router.put(
  "/:id/renew",
  authenticate,
  authorize(["admin", "moderator", "root"]),
  renewUser
);

module.exports = router;
