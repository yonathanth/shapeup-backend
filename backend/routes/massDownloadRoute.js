const express = require("express");
const router = express.Router();
const { getAllUsers } = require("../controllers/massDownload");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate, authorize(["admin", "moderator", "root"]));

router.get("/", getAllUsers);

module.exports = router;
