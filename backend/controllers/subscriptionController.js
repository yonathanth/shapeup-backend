const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

const requestSubscriptionExtension = asyncHandler(async (req, res) => {
  const { id: userId } = req.params; // User ID
  const { serviceId } = req.body; // Service for which the extension is requested

  if (!serviceId) {
    return res
      .status(400)
      .json({ success: false, message: "Service ID is required." });
  }

  // Check if the user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Check if the service exists
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return res
      .status(404)
      .json({ success: false, message: "Service not found." });
  }

  // Check if there is an existing pending or approved request for this user and service
  const existingRequest = await prisma.subscriptionRequest.findFirst({
    where: {
      userId,
      serviceId,
      status: "pending",
    },
  });

  if (existingRequest) {
    return res.status(400).json({
      success: false,
      message: "You already have a pending  request for this service.",
    });
  }

  // Create a new subscription request
  const newRequest = await prisma.subscriptionRequest.create({
    data: {
      userId,
      serviceId,
    },
  });

  res.status(201).json({
    success: true,
    message: "Subscription extension request submitted successfully.",
    data: newRequest,
  });
});

const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const { id: userId } = req.params; // Extract user ID from request params

  // Get the latest subscription request for the user
  const latestRequest = await prisma.subscriptionRequest.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc", // Sort by creation date in descending order
    },
  });

  if (latestRequest) {
    return res.status(200).json({
      success: true,
      status: latestRequest.status, // Return the status of the latest request
      serviceId: latestRequest.serviceId,
    });
  }

  res.status(200).json({
    success: true,
    message: "No subscription requests found.",
  });
});

const getSubscriptionRequests = asyncHandler(async (req, res) => {
  // Fetch all subscription requests with user and service details
  const requests = await prisma.subscriptionRequest.findMany({
    include: {
      user: {
        select: {
          fullName: true,
          id: true,
          // Get user's full name
        },
      },
      service: {
        select: {
          name: true, // Get service name
          price: true, // Get service fee
        },
      },
    },
    orderBy: {
      requestDate: "desc", // Sort requests by the most recent first
    },
  });

  // Format the data for the response
  const formattedRequests = requests.map((request) => ({
    id: request.id,
    userName: request.user.fullName,
    userId: request.user.id,
    requestDate: request.requestDate,
    serviceName: request.service.name,
    serviceFee: request.service.price,
    status: request.status,
  }));

  res.status(200).json({
    success: true,
    data: formattedRequests,
  });
});

const updateSubscriptionRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params; // Request ID
  const { status, startDate } = req.body; // Status and optional start date

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }

  // Fetch the subscription request
  const request = await prisma.subscriptionRequest.findUnique({
    where: { id },
    include: { user: true, service: true }, // Include related user and service data
  });

  if (!request) {
    return res
      .status(404)
      .json({ success: false, message: "Subscription request not found." });
  }

  // Fetch the user's current daysLeft
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Update the request status
  const updatedRequest = await prisma.subscriptionRequest.update({
    where: { id },
    data: { status },
  });

  // If the status is approved, update the user's subscription
  if (status === "approved") {
    const serviceDays = request.service.period; // Assume `period` is the service duration in days

    // Validate or set the start date
    let parsedStartDate = startDate ? new Date(startDate) : new Date();
    if (isNaN(parsedStartDate.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid start date." });
    }

    // Fetch current daysLeft
    let daysLeft = user.daysLeft;
    let updatedDaysLeft = serviceDays; // Default to service period in days

    // Check if the user's current daysLeft is below zero
    if (daysLeft < 0) {
      // Adjust the start date if daysLeft is below zero
      const adjustedStartDate = new Date(parsedStartDate);
      adjustedStartDate.setDate(adjustedStartDate.getDate() + daysLeft);
      parsedStartDate = adjustedStartDate;

      updatedDaysLeft = serviceDays + daysLeft;
    } else {
      updatedDaysLeft = serviceDays;
    }

    // Update the user data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        startDate: parsedStartDate,
        daysLeft: updatedDaysLeft, // Update the days left
        freezeDate: null, // Reset freeze-related fields
        preFreezeAttendance: 0,
        preFreezeDaysCount: 0,
        status: "active", // Set user to active
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `Subscription request ${status}.`,
    data: updatedRequest,
  });
});

module.exports = {
  updateSubscriptionRequestStatus,
  requestSubscriptionExtension,
  checkSubscriptionStatus,
  getSubscriptionRequests,
};
