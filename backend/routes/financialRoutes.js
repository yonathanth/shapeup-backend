const express = require("express");
const router = express.Router();

const {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
} = require("../controllers/financialController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate, authorize(["admin", "root"]));

router.get("/", getTransactions);

router.post("/", addTransaction);
router.patch("/:id", updateTransaction);

router.delete("/:id", deleteTransaction);

// router.get("/transactions/graph-data", getTransactionDataForGraph);

module.exports = router;
