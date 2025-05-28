const express = require("express");
const {
  updateSubscriptionRequestStatus,
  requestSubscriptionExtension,
  checkSubscriptionStatus,
  getSubscriptionRequests,
} = require("../controllers/subscriptionController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Route for requesting a subscription extension
router.post("/:id", authenticate, requestSubscriptionExtension);
// Route for updating the subscription request status
router.patch(
  "/:id/changeStatus",
  authenticate,
  authorize(["admin", "moderator", "root"]),
  updateSubscriptionRequestStatus
);
// Route for checking a user's subscription status
router.get("/:id/subscriptionStatus", authenticate, checkSubscriptionStatus);
// Route for getting all subscription requests
router.get("/", authenticate, getSubscriptionRequests);

module.exports = router;
