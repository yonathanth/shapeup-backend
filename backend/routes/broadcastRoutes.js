const express = require("express");
const router = express.Router();

const {
  getBroadcasts,
  addBroadcast,
  editBroadcast,
} = require("../controllers/broadcastController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
router.use(authenticate);

router.get("/", getBroadcasts);
router.post("/add", authorize(["admin", "moderator", "root"]), addBroadcast);
router.put("/edit", authorize(["admin", "moderator", "root"]), editBroadcast);

module.exports = router;
