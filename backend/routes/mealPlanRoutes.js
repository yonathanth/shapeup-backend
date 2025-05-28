const express = require("express");
const router = express.Router();

const {
  getMealPlans,
  getMealPlan,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  upload,
} = require("../controllers/mealPlanController");
const { authenticate } = require("../middleware/authMiddleware");

router.use(authenticate);
router.get("/", getMealPlans);
router.get("/:id", getMealPlan);
router.post("/add", upload.single("image"), createMealPlan);
router.patch("/:id", updateMealPlan);
router.delete("/:id", deleteMealPlan);

module.exports = router;
