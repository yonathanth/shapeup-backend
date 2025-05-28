const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/authMiddleware");

const {
  getUsers,
  addUser,
  editUser,
  deleteUser,
  getUserDetails,
  updateNotification,
  addUserMealPlan,
  addUserWorkout,
  getMyWorkouts,
  getMyMealPlans,
  updateFingerprintTemplate,
} = require("../controllers/membersController");

// Public route: Get all users (this could be protected depending on your needs)
router.get(
  "/",
  authenticate,
  authorize(["admin", "moderator", "root"]),
  getUsers
);

// Protected routes: Only authenticated users can access these
router.post("/", addUser);
router.patch("/:id", authenticate, editUser);
router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "moderator", "root"]),
  deleteUser
);
router.get("/:id", authenticate, getUserDetails);

// Protected routes for user-specific actions
router.patch("/:id/notification", authenticate, updateNotification);
router.post("/:id/meal-plan", authenticate, addUserMealPlan);
router.post("/:id/workout", authenticate, addUserWorkout);
router.get("/:id/workouts", authenticate, getMyWorkouts);
router.get("/:id/meal-plans", authenticate, getMyMealPlans);
router.patch(
  "/:id/fingerprint",
  authenticate,
  authorize(["admin", "moderator", "root"]),
  updateFingerprintTemplate
);

// Admin only route
router.get(
  "/en/admin",
  authenticate,
  authorize(["admin", "root"]),
  (req, res) => {
    res.send("Welcome to the Admin Page! You are an authenticated admin");
  }
);

module.exports = router;
