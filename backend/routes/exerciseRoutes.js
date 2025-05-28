const express = require("express");
const router = express.Router();

const {
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  upload,
} = require("../controllers/exerciseController");
const { authenticate } = require("../middleware/authMiddleware");
router.use(authenticate);

router.get("/", getExercises);
router.get("/:id", getExercise);
router.post("/add", upload.single("image"), createExercise);
router.patch("/:id", updateExercise);
router.delete("/:id", deleteExercise);

module.exports = router;
