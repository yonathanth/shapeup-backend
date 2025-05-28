const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

// Get all staff members (admin and moderator roles)
const getStaff = asyncHandler(async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ["admin", "moderator"],
        },
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
      },
    });

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff members",
    });
  }
});

// Update staff member (phone number and/or password)
const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { phoneNumber, password } = req.body;

  try {
    const updateData = {};

    if (phoneNumber) {
      // Check if phone number is already in use
      const existingUser = await prisma.user.findFirst({
        where: {
          phoneNumber,
          id: { not: id },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already in use",
        });
      }

      updateData.phoneNumber = phoneNumber;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid update data provided",
      });
    }

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedStaff,
      message: "Staff member updated successfully",
    });
  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update staff member",
    });
  }
});

module.exports = {
  getStaff,
  updateStaff,
};
