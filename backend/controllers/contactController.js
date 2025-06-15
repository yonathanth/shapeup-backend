const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Create a new contact message
const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: "Name, email, subject, and message are required.",
      });
    }

    // Create the contact message
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
      },
    });

    return res.status(201).json({
      message: "Contact message sent successfully.",
      data: contactMessage,
    });
  } catch (error) {
    console.error("Error creating contact message:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Get all contact messages (admin only)
const getAllContactMessages = async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ data: messages });
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Get a single contact message by ID (admin only)
const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: "Contact message not found." });
    }

    return res.status(200).json({ data: message });
  } catch (error) {
    console.error("Error fetching contact message:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Mark a contact message as read (admin only)
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: "Contact message not found." });
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({
      message: "Message marked as read.",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Delete a contact message (admin only)
const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: "Contact message not found." });
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return res
      .status(200)
      .json({ message: "Contact message deleted successfully." });
  } catch (error) {
    console.error("Error deleting contact message:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  markAsRead,
  deleteContactMessage,
};
