const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const multer = require("multer");
const path = require("path");
const { existsSync, unlinkSync } = require("node:fs");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/advertisement/");
  },
  filename: (req, file, cb) => {
    if (!req.body.slug) {
      return cb(new Error("Slug is required in the request body"));
    }
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.body.slug}${extension}`);
  },
});

const clearDirectory = (directory) => {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        return reject(err);
      }
      Promise.all(
        files.map((file) => fs.promises.unlink(path.join(directory, file)))
      )
        .then(() => resolve())
        .catch((err) => reject(err));
    });
  });
};

// Middleware to clear directory before uploading
const clearAndUpload = async (req, res, next) => {
  try {
    await clearDirectory("uploads/advertisement/");
    next();
  } catch (err) {
    console.error("Error clearing directory:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to clear directory." });
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPEG, PNG, GIF) are allowed."));
  },
});
const getAdvertisement = asyncHandler(async (req, res) => {
  try {
    const advertisements = await prisma.advertisement.findMany();
    if (!advertisements || advertisements.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No advertisements found.",
      });
    }
    res.status(200).json({
      success: true,
      data: { advertisements },
    });
  } catch (error) {
    console.error("Error fetching advertisements:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advertisements. Please try again later.",
    });
  }
});

const addAdvertisement = asyncHandler(async (req, res) => {
  const { name, slug, description } = req.body;

  try {
    if (!name || !slug || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields ('name', 'slug', 'description') are required.",
      });
    }

    const formattedSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    const slugWithExtension = `${formattedSlug}${fileExtension}`;

    const newAdvertisement = await prisma.advertisement.create({
      data: { name, slug: slugWithExtension, description },
    });

    res.status(201).json({
      success: true,
      message: "Advertisement added successfully.",
      data: newAdvertisement,
    });
  } catch (error) {
    console.error("Error adding advertisement:", error.message);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "An advertisement with the same slug already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add advertisement. Please try again later.",
    });
  }
});

const editAdvertisement = asyncHandler(async (req, res) => {
  const { name, description, slug } = req.body;

  try {
    // Check if at least one field is provided
    if (!name && !description && !slug && !req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one field ('name', 'description', 'slug', or a new image file) to update.",
      });
    }

    let updatedData = {};

    // Add fields to the update object if they exist
    if (name) updatedData.name = name;
    if (description) updatedData.description = description;

    // Handle slug with a new image file
    if (slug || req.file) {
      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Slug is required to update the advertisement.",
        });
      }

      // Format the slug
      const formattedSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

      // If there's a new file, append its extension to the slug
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        updatedData.slug = `${formattedSlug}${fileExtension}`;
      } else {
        updatedData.slug = formattedSlug;
      }
    }

    // Update the advertisement (modify the `where` condition to match specific records)
    const updatedAdvertisement = await prisma.advertisement.updateMany({
      where: {}, // Adjust the condition to match the specific advertisement(s)
      data: updatedData,
    });

    // Check if any advertisement was updated
    if (updatedAdvertisement.count === 0) {
      return res.status(404).json({
        success: false,
        message: "No advertisement found to update.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Advertisement updated successfully.",
    });
  } catch (error) {
    console.error("Error updating advertisement:", error.message);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "An advertisement with the same slug already exists.",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update advertisement. Please try again later.",
    });
  }
});

module.exports = {
  getAdvertisement,
  addAdvertisement,
  editAdvertisement,
  upload,
  clearAndUpload,
  clearDirectory,
};
