const express = require("express");
const { getUserDetails } = require("../controllers/nonActiveMembersController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();
router.use(authenticate);
router.get("/:id", getUserDetails);

module.exports = router;
