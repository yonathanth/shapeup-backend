const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

const getOrders = asyncHandler(async (req, res) => {
  // Fetch all orders with their associated order items and product details
  const orders = await prisma.order.findMany({
    include: {
      orderItems: {
        include: {
          product: true, // Include product details in each order item
        },
      },
    },
  });

  // Calculate aggregated stats
  const totalOrders = orders.length;
  let totalSales = 0;
  let totalDelivered = 0;
  let totalPending = 0;

  orders.forEach((order) => {
    // Calculate total sales by summing up (quantity * price) for each order item
    order.orderItems.forEach((item) => {
      totalSales += item.quantity * item.product.price;
    });

    // Count orders by status
    if (order.status === "Delivered") totalDelivered += 1;
    if (order.status === "Pending") totalPending += 1;
  });

  // Return the aggregated stats and order details
  res.status(200).json({
    success: true,
    data: {
      totalSales,
      totalOrders,
      totalDelivered,
      totalPending,
      orders, // Detailed list of orders with items and product details
    },
  });
});

const addOrder = asyncHandler(async (req, res) => {
  const { customerName, phoneNumber, status, orderItems } = req.body;

  // Validate required fields
  if (
    !customerName ||
    !phoneNumber ||
    !status ||
    !Array.isArray(orderItems) ||
    orderItems.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "All fields (customerName, phoneNumber, status, orderItems) are required. OrderItems must be a non-empty array.",
    });
  }

  // Validate phone number format
  if (!/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: "Phone number must be exactly 10 digits.",
    });
  }

  // Validate and check product availability
  for (const item of orderItems) {
    const { productId, quantity } = item;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Each order item must have a productId and quantity.",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${productId} not found.`,
      });
    }
  }

  // Create the order and related items
  const newOrder = await prisma.order.create({
    data: {
      customerName,
      phoneNumber,
      status,
      orderItems: {
        create: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      orderItems: true, // Include related items in the response
    },
  });

  res.status(201).json({
    success: true,
    message: "Order added successfully.",
    data: newOrder,
  });
});

// Toggle the status of an order between "Delivered" and "Pending"
const toggleOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the order
  const order = await prisma.order.findUnique({
    where: { id },
  });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  // Toggle status
  const newStatus = order.status === "Delivered" ? "Pending" : "Delivered";

  // Update the order status
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { status: newStatus },
  });

  res.status(200).json({
    success: true,
    message: `Order status updated to ${newStatus}.`,
    data: updatedOrder,
  });
});

// Delete an order by ID
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if the order exists
  const order = await prisma.order.findUnique({
    where: { id },
  });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  // Delete the order
  await prisma.order.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: "Order deleted successfully.",
  });
});

module.exports = {
  getOrders,
  addOrder,
  toggleOrderStatus, // Export the toggle function
  deleteOrder,
};
