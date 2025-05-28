const express = require("express");
const {
  getStockItems,
  addStockItem,
  deleteStockItem,
  increaseQuantity,
  decreaseQuantity,
  updateStock,
} = require("../controllers/stockController");

const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticate, authorize(["admin", "root"]));

router.get("/", getStockItems);

router.post("/", addStockItem);

router.delete("/:id", deleteStockItem);

router.patch("/:id/increaseQuantity", increaseQuantity);

router.patch("/:id/decreaseQuantity", decreaseQuantity);

router.patch("/:id/edit", updateStock);

module.exports = router;
