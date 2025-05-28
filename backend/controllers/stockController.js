const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get all stock items
const getStockItems = asyncHandler(async (req, res) => {
  const items = await prisma.stock.findMany();
  res.status(200).json({
    success: true,
    data: items,
  });
});

// Add a new stock item
const addStockItem = asyncHandler(async (req, res) => {
  const { itemName, category, quantity, packs } = req.body;

  if (!itemName || !category || quantity == null) {
    return res.status(400).json({
      success: false,
      message: "All fields (itemName, category, quantity) are required.",
    });
  }

  // Check if quantity is a number
  if (isNaN(quantity) || !Number.isInteger(Number(quantity)) || quantity < 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be a non-negative integer.",
    });
  }

  if (isNaN(packs) || !Number.isInteger(Number(packs)) || packs < 0) {
    return res.status(400).json({
      success: false,
      message: "Packs Qty must be a non-negative integer.",
    });
  }

  const newItem = await prisma.stock.create({
    data: {
      itemName,
      category,
      quantity: parseInt(quantity, 10), // Convert quantity to an integer
      packs,
    },
  });

  res.status(201).json({
    success: true,
    message: "Stock item added successfully.",
    data: newItem,
  });
});

const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { itemName, category, packs, quantity } = req.body;

  // Check if the stock ID is provided
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Stock ID is required.",
    });
  }

  // Validate the `packs` and `quantity` fields (if provided)
  if (packs !== undefined && (!Number.isInteger(packs) || packs < 0)) {
    return res.status(400).json({
      success: false,
      message: "Packs must be a non-negative integer.",
    });
  }

  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be a non-negative integer.",
    });
  }

  // Find the stock to ensure it exists before updating
  const stock = await prisma.stock.findUnique({
    where: { id },
  });

  if (!stock) {
    return res.status(404).json({
      success: false,
      message: "Stock item not found.",
    });
  }

  // Update the stock with the provided fields
  const updatedStock = await prisma.stock.update({
    where: { id },
    data: {
      itemName: itemName || stock.itemName,
      category: category || stock.category,
      packs: packs !== undefined ? packs : stock.packs,
      quantity: quantity !== undefined ? quantity : stock.quantity,
    },
  });

  res.status(200).json({
    success: true,
    message: "Stock item updated successfully.",
    data: updatedStock,
  });
});

// Delete a stock item by ID
const deleteStockItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.stock.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Stock item deleted successfully.",
  });
});

// Increase quantity by 1
const increaseQuantity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updatedItem = await prisma.stock.update({
    where: { id },
    data: {
      quantity: {
        increment: 1,
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Quantity increased by 1.",
    data: updatedItem,
  });
});

// Decrease quantity by 1
const decreaseQuantity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await prisma.stock.findUnique({
    where: { id },
  });

  if (item && item.quantity > 0) {
    const updatedItem = await prisma.stock.update({
      where: { id },
      data: {
        quantity: {
          decrement: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Quantity decreased by 1.",
      data: updatedItem,
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Quantity cannot be less than zero.",
    });
  }
});

module.exports = {
  getStockItems,
  updateStock,
  addStockItem,
  deleteStockItem,
  increaseQuantity,
  decreaseQuantity,
};
