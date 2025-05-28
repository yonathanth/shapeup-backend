const express = require("express");
const {
  getOrders,
  addOrder,
  toggleOrderStatus,
  deleteOrder,
} = require("../controllers/ordersController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticate, authorize(["admin", "moderator", "root"]));

router.get("/", getOrders);
router.post("/", addOrder);
router.patch("/:id/toggleStatus", toggleOrderStatus);
router.delete("/:id", deleteOrder);

module.exports = router;
