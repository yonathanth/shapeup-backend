const express = require("express");
const router = express.Router();
const {
  getUserAnalytics,
  getOverallStats,
} = require("../controllers/userAnalyticsController");

// Get user analytics by time period
router.get("/analytics", getUserAnalytics);

// Get overall user statistics
router.get("/stats", getOverallStats);

module.exports = router;
