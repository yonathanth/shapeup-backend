const express = require("express");
const router = express.Router();

const {
  getWorkouts,
  getWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  upload,
} = require("../controllers/workoutController");
const { authenticate } = require("../middleware/authMiddleware");

router.use(authenticate);

router.get("/", getWorkouts);
router.get("/:id", getWorkout);
router.post("/add", upload.single("image"), createWorkout);
router.patch("/:id", updateWorkout);
router.delete("/:id", deleteWorkout);

module.exports = router;
