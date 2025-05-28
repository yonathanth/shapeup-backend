const express = require("express");
const router = express.Router();

const {
  markAsCompleted,
} = require("../controllers/exerciseCompletionController");
const { authenticate } = require("../middleware/authMiddleware");

router.use(authenticate);

router.post("/", markAsCompleted);
module.exports = router;
