const express = require("express");
const router = express.Router();
const {
  getEmployees,
  registerEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeesController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
router.use(authenticate, authorize(["admin", "root"]));
router.get("/", getEmployees);
router.post("/register", registerEmployee);
router.route("/:id").delete(deleteEmployee).patch(updateEmployee);

module.exports = router;
