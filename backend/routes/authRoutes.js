const express = require("express");
const authController = require("../controllers/authController"); // Ensure this is the correct path
const router = express.Router();

// Register and login routes
router.post("/register", authController.register); // Ensure this matches the function name
router.post("/login", authController.login); // Ensure this matches the function name

module.exports = router;
