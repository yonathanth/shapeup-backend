const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Fetch user details by ID
const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate that an ID was provided
  if (!id) {
    res.status(400);
    throw new Error("User ID is required");
  }

  // Fetch the user details from the database
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      fullName: true,
      serviceId: true,
      isComplete: true,
      service: {
        select: {
          price: true,
        },
      },
    },
  });

  // Check if the user was found
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Return the relevant data
  res.status(200).json({
    username: user.fullName,
    serviceId: user.serviceId,
    servicePrice: user.service?.price || null,
    isComplete: user.isComplete, // Handle cases where service is null
  });
});

module.exports = { getUserDetails };
