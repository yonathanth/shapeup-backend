const express = require("express");
const router = express.Router();

const {
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  upload,
} = require("../controllers/mealController");
const { authenticate } = require("../middleware/authMiddleware");

router.use(authenticate);

router.get("/", getMeals);
router.get("/:id", getMeal);
router.post("/add", upload.single("image"), createMeal);
router.patch("/:id", updateMeal);
router.delete("/:id", deleteMeal);

module.exports = router;
