const asyncHandler = require("express-async-handler");
const bwipjs = require("bwip-js");
const prisma = require("../../prisma/client"); // Adjust according to your setup

const generateBarcode = async (userId) => {
  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: userId,
      scale: 2,
      height: 20,
      includetext: true,
      textxalign: "center",
      textsize: 12,
    });
    return `data:image/png;base64,${barcodeBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Barcode generation error:", error);
    throw new Error("Failed to generate barcode");
  }
};

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "user" },
    select: {
      id: true,
      fullName: true,
      gender: true,
      phoneNumber: true,
      startDate: true,
      email: true,
      address: true,
      emergencyContact: true,
      service: {
        select: { name: true },
      },
      profileImageUrl: true,
    },
  });

  if (!users.length) {
    return res.status(404).json({
      success: false,
      message: "No users found",
    });
  }

  // Generate barcodes for all users
  const usersWithBarcodes = await Promise.all(
    users.map(async (user) => ({
      ...user,
      barcode: await generateBarcode(user.id),
    }))
  );

  res.status(200).json({
    success: true,
    data: usersWithBarcodes,
  });
});

module.exports = { getAllUsers };
