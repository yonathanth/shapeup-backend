const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/mealPlans/");
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

const getMealPlans = asyncHandler(async (req, res) => {
    const mealPlans = await prisma.mealPlan.findMany({
      include: {
        meals: {
          include: {
            meal: true, // Include the actual Meal data
          },
        },
      },
    });

    // Transform the data to include the meals directly in the mealPlan object
    const transformedMealPlans = mealPlans.map((mealPlan) => ({
      ...mealPlan,
      meals: mealPlan.meals.map((mpm) => mpm.meal), // Extract actual Meal data
    }));

    res.status(200).json({
      success: true,
      data: {mealPlans :transformedMealPlans},
    });
});


const getMealPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        id,
      },
      include: {
        meals: {
          include: {
            meal: true,
          },
        },
      },
    });

    if (!mealPlan) {
      return res
          .status(404)
          .json({ success: false, message: "Meal Plan not found" });
    }

    const transformedMealPlan = {
      ...mealPlan,
      meals: mealPlan.meals.map((mpm) => mpm.meal),
    };

    res.status(200).json({ success: true, data: {mealPlan :transformedMealPlan} });
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the meal plan.",
      error: error.message,
    });
  }
});



const createMealPlan = asyncHandler(async (req, res) => {
  const { name, slug, description, category, mainGoal, duration, meals } =
      req.body;
  try {
    const formattedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const slugWithExtension = `${formattedSlug}${fileExtension}`;
    let parsedMeals = [];
    if (meals) {
      try {
        parsedMeals = JSON.parse(meals); // Convert JSON string to an array
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format for meal Ids",
        });
      }
    }
    if (!Array.isArray(parsedMeals)) {
      return res.status(400).json({
        success: false,
        message: "meal Ids must be an array",
      });
    }

    if (parsedMeals && parsedMeals.length > 0) {
      const existingMeals = await prisma.meal.findMany({
        where: {
          id: {
            in: parsedMeals,
          },
        },
      });
      console.log(existingMeals)
      if (existingMeals.length !== parsedMeals.length) {
        return res.status(404).json({
          success: false,
          message: "One or more meal IDs are invalid.",
        });
      }
      console.log(parsedMeals.length)
      // Create the MealPlan and connect the existing meals
      const newMealPlan = await prisma.mealPlan.create({
        data: {
          name,
          slug: slugWithExtension,
          description,
          category,
          mainGoal,
          duration: parseInt(duration),
        },
      });
      const mealPlanMeals = parsedMeals.map((mealId) => ({
        mealPlanId: newMealPlan.id,
        mealId,
      }));

      await prisma.mealPlanMeal.createMany({
        data: mealPlanMeals,
      });


      return res.status(201).json({
        success: true,
        message: "MealPlan created successfully",
        data: newMealPlan,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "No meals selected.",
      });
    }
  } catch (error) {
    console.error("Error creating mealPlans:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the meal plan.",
      error: error.message,
    });
  }
});

const updateMealPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, category, mainGoal, duration, meals } =
      req.body;

  try {
    const mealPlanExists = await prisma.mealPlan.findUnique({
      where: { id },
    });

    if (!mealPlanExists) {
      return res.status(404).json({
        success: false,
        message: "MealPlan not found",
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (mainGoal) updateData.mainGoal = mainGoal;
    if (duration) updateData.duration = duration;
    if (meals?.length) {
      updateData.meals = {
        update: meals.map((meal) => ({
          where: { id: meal.id },
          data: {
            name: meal.name,
            slug: meal.slug,
            description: meal.description,
            vegan: meal.vegan,
            preparationTime: meal.preparationTime,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
            ingredients: meal.ingredients,
          },
        })),
      };
    }
    const updatedMealPlan = await prisma.mealPlan.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "MealPlan updated successfully",
      data: updatedMealPlan,
    });
  } catch (error) {
    console.error("Error updating mealPlans:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the mealPlans.",
      error: error.message,
    });
  }
});

const deleteMealPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const mealPlanExists = await prisma.mealPlan.findUnique({
      where: { id },
    });

    if (!mealPlanExists) {
      return res.status(404).json({
        success: false,
        message: "MealPlan not found",
      });
    }
    const deletedMealPlan = await prisma.mealPlan.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "MealPlan deleted successfully",
      data: deletedMealPlan,
    });
  } catch (error) {
    console.error("Error deleting mealPlans:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the mealPlans.",
      error: error.message,
    });
  }
});

module.exports = {
  getMealPlans,
  getMealPlan,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  upload,
};
