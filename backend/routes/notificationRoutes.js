const express = require("express");
const router = express.Router();

const {
  getAdvertisement,
  addAdvertisement,
  editAdvertisement,
} = require("../controllers/advertisementController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate);

router.get("/", getAdvertisement);
router.post(
  "/add",
  authorize(["admin", "moderator", "root"]),
  addAdvertisement
);
router.put(
  "/edit",
  authorize(["admin", "moderator", "root"]),
  editAdvertisement
);

module.exports = router;
