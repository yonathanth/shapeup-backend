const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

const getBroadcasts = asyncHandler(async (req, res) => {
    try {
        const broadcasts = await prisma.broadcast.findMany();
        if (!broadcasts || broadcasts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No broadcasts found.",
            });
        }
        res.status(200).json({
            success: true,
            data: { broadcasts },
        });
    } catch (error) {
        console.error("Error fetching broadcasts:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch broadcasts. Please try again later.",
        });
    }
});

const addBroadcast = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    try {
        // Validate input
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Both 'name' and 'description' are required.",
            });
        }

        // Add new broadcast
        const newBroadcast = await prisma.broadcast.create({
            data: { name, description },
        });

        res.status(201).json({
            success: true,
            message: "Broadcast added successfully.",
            data: newBroadcast,
        });
    } catch (error) {
        console.error("Error adding broadcast:", error.message);

        // Handle database-specific errors (e.g., constraint violations)
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A broadcast with the same name already exists.",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to add broadcast. Please try again later.",
        });
    }
});

const editBroadcast = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    try {
        // Validate input
        if (!name && !description) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field ('name' or 'description') to update.",
            });
        }

        // Update the broadcast(s)
        const updatedBroadcast = await prisma.broadcast.updateMany({
            where: {}, // Matches all records (you may need specific logic for identifying the record)
            data: {
                ...(name && { name }),
                ...(description && { description }),
            },
        });

        // Check if any records were updated
        if (updatedBroadcast.count === 0) {
            return res.status(404).json({
                success: false,
                message: "No broadcast found to update.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Broadcast updated successfully.",
        });
    } catch (error) {
        console.error("Error updating broadcast:", error.message);

        // Handle specific database errors
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Broadcast not found.",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update broadcast. Please try again later.",
        });
    }
});

module.exports = {
    getBroadcasts,
    addBroadcast,
    editBroadcast,
};
