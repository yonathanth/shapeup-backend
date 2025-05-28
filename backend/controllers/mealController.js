const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/meals");
  },
  filename: (req, file, cb) => {
    if (!req.body.slug) {
      return cb(new Error("Slug is required in the request body"));
    }
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.body.slug}${extension}`);
  },
});

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
    cb(new Error("Only images are allowed!"));
  },
});

const getMeals = asyncHandler(async (req, res) => {
  try {
    const meals = await prisma.meal.findMany({
      include: { ingredients: true },
    });

    if (!meals || meals.length === 0) {
      return res
          .status(404)
          .json({ success: false, message: "No meals found" });
    }

    res.status(200).json({ success: true, data: { meals } });
  } catch (error) {
    res
        .status(500)
        .json({ success: false, message: "Server error", error: error.message });
  }
});

const getMeal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const meal = await prisma.meal.findUnique({
      where: {
        id,
      },
    });
    if (!meal) {
      return res
          .status(404)
          .json({ success: false, message: "Meal not found" });
    }
    res.status(200).json({ success: true, data: { meal } });
  } catch (error) {
    res
        .status(500)
        .json({ success: false, message: "Server error", error: error.message });
  }
});

const createMeal = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    description,
    category,
    instructions,
    calories,
    vegan,
    preparationTime,
    protein,
    carbs,
    fats,
    ingredients,
  } = req.body;
  try {
    const parsedIngredients = ingredients ? JSON.parse(ingredients) : [];
    const formattedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const slugWithExtension = `${formattedSlug}${fileExtension}`;
    const newMeal = await prisma.meal.create({
      data: {
        name,
        slug: slugWithExtension,
        description,
        category,
        instructions,
        calories: calories ? parseFloat(calories) : null,
        vegan: vegan === "true",
        preparationTime: preparationTime ? parseInt(preparationTime) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fats: fats ? parseFloat(fats) : null,
        ingredients: {
          create: parsedIngredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity, // Ensure quantity is passed too
          })),
        },
      },
    });
    return res.status(201).json({
      success: true,
      message: "Meal created successfully",
      data: newMeal,
    });
  } catch (error) {
    console.error("Error creating meal:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the meal.",
      error: error.message,
    });
  }
});

const updateMeal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    slug,
    description,
    category,
    instructions,
    calories,
    vegan,
    preparationTime,
    protein,
    carbs,
    fats,
    ingredients,
  } = req.body;

  try {
    const MealExists = await prisma.Meal.findUnique({
      where: { id },
    });

    if (!MealExists) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (ingredients) updateData.ingredients = ingredients;
    if (instructions) updateData.instructions = instructions;
    if (calories) updateData.calories = calories;
    if (vegan) updateData.vagan = vegan;
    if (preparationTime) updateData.preparationTime = preparationTime;
    if (protein) updateData.protein = protein;
    if (carbs) updateData.carbs = carbs;
    if (fats) updateData.fats = fats;

    const updatedMeal = await prisma.meal.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Meal updated successfully",
      data: updatedMeal,
    });
  } catch (error) {
    console.error("Error updating Meal:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the Meal.",
      error: error.message,
    });
  }
});

const deleteMeal = asyncHandler(async (req, res) => {
  console.log("yes")
  const { id } = req.params;
  try {
    const mealExists = await prisma.meal.findUnique({
      where: { id },
    });

    if (!mealExists) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }
    const deletedMeal = await prisma.meal.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Meal deleted successfully",
      data: deletedMeal,
    });
  } catch (error) {
    console.error("Error deleting meal:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the meal.",
      error: error.message,
    });
  }
});

module.exports = {
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  upload,
};
