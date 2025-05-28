const express = require("express");
const router = express.Router();
const {
  getServices,
  addService,
  addMultipleServices,
  editService,
  deleteService,
  getServiceById,
} = require("../controllers/serviceController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.get("/", getServices);

router.post("/", addService);
router.post(
  "/bulk",
  // authenticate,
  // authorize(["admin", "root"]),
  addMultipleServices
);
router.patch("/:id", authenticate, authorize(["admin", "root"]), editService);

router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "root"]),
  deleteService
);
router.get("/:id", getServiceById);

module.exports = router;
