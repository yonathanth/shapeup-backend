const express = require("express");
const router = express.Router();
const {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  markAsRead,
  deleteContactMessage,
} = require("../controllers/contactController");

// Public route - Create a new contact message
router.post("/", createContactMessage);

// Admin routes - Require authentication
router.get("/", getAllContactMessages);
router.get("/:id", getContactMessageById);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteContactMessage);

module.exports = router;
