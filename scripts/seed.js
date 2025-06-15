const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Starting database seeding...");

    // Load data files
    const exercisesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "exercises.json"), "utf8")
    );
    const mealsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "meals.json"), "utf8")
    );
    const mealPlansData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "mealPlans.json"), "utf8")
    );
    const workoutsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "workouts.json"), "utf8")
    );

    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await prisma.mealPlanMeal.deleteMany({});
    await prisma.ingredient.deleteMany({});
    await prisma.userMealPlan.deleteMany({});
    await prisma.userWorkout.deleteMany({});
    await prisma.exerciseCompletion.deleteMany({});
    await prisma.equipment.deleteMany({});
    await prisma.meal.deleteMany({});
    await prisma.mealPlan.deleteMany({});
    await prisma.exercise.deleteMany({});
    await prisma.workout.deleteMany({});

    // Seed Exercises
    console.log("💪 Seeding exercises...");
    for (const exerciseData of exercisesData) {
      await prisma.exercise.create({
        data: {
          id: exerciseData.id,
          slug: exerciseData.slug,
          name: exerciseData.name,
          description: exerciseData.description,
          reps: exerciseData.reps,
          sets: exerciseData.sets,
          duration: exerciseData.duration,
          videoUrl: exerciseData.videoUrl,
          focusArea: exerciseData.focusArea,
        },
      });
    }
    console.log(`✅ Created ${exercisesData.length} exercises`);

    // Seed Meals
    console.log("🍽️ Seeding meals...");
    for (const mealData of mealsData) {
      await prisma.meal.create({
        data: {
          id: mealData.id,
          name: mealData.name,
          slug: mealData.slug,
          description: mealData.description,
          category: mealData.category,
          instructions: mealData.instructions,
          calories: mealData.calories,
          vegan: mealData.vegan,
          preparationTime: mealData.preparationTime,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fats: mealData.fats,
          ingredients: {
            create: mealData.ingredients.map((ingredient) => ({
              name: ingredient.name,
              quantity: ingredient.quantity,
            })),
          },
        },
      });
    }
    console.log(`✅ Created ${mealsData.length} meals`);

    // Seed Meal Plans
    console.log("📋 Seeding meal plans...");
    for (const mealPlanData of mealPlansData) {
      const mealPlan = await prisma.mealPlan.create({
        data: {
          id: mealPlanData.id,
          name: mealPlanData.name,
          slug: mealPlanData.slug,
          description: mealPlanData.description,
          category: mealPlanData.category,
          mainGoal: mealPlanData.mainGoal,
          duration: mealPlanData.duration,
        },
      });

      // Create meal plan meal relationships
      for (const mealId of mealPlanData.meals) {
        await prisma.mealPlanMeal.create({
          data: {
            mealId: mealId,
            mealPlanId: mealPlan.id,
          },
        });
      }
    }
    console.log(`✅ Created ${mealPlansData.length} meal plans`);

    // Seed Workouts
    console.log("🏋️ Seeding workouts...");
    for (const workoutData of workoutsData) {
      await prisma.workout.create({
        data: {
          id: workoutData.id,
          name: workoutData.name,
          slug: workoutData.slug,
          difficulty: workoutData.difficulty,
          mainGoal: workoutData.mainGoal,
          workoutType: workoutData.workoutType,
          duration: workoutData.duration,
          daysPerWeek: workoutData.daysPerWeek,
          timePerWorkout: workoutData.timePerWorkout,
          targetGender: workoutData.targetGender,
          exercises: {
            connect: workoutData.exercises.map((exerciseId) => ({
              id: exerciseId,
            })),
          },
        },
      });
    }
    console.log(`✅ Created ${workoutsData.length} workouts`);

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
