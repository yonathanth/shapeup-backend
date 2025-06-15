# Database Seeding

This directory contains scripts and data files for seeding the database with fitness-related content.

## Data Files

- `data/exercises.json` - Exercise definitions with sets, reps, duration, and focus areas
- `data/meals.json` - Meal recipes with ingredients, nutritional information, and preparation instructions
- `data/mealPlans.json` - Meal plan collections linking multiple meals together
- `data/workouts.json` - Workout programs combining exercises into structured routines

## Running the Seed Script

To seed the database with the fitness data:

```bash
# From the shapeup-backend directory
npm run seed
```

This will:

1. Clear existing fitness data (exercises, meals, meal plans, workouts)
2. Import all exercises from the JSON file
3. Import all meals with their ingredients
4. Create meal plans and link them to their respective meals
5. Create workout programs and link them to their exercises

## Data Structure

### Exercises

- Support multiple focus areas (Chest, Back, Legs, Arms, Core, Shoulders, FullBody, etc.)
- Include video URLs for demonstration
- Specify sets, reps, and duration

### Meals

- Include complete nutritional information (calories, protein, carbs, fats)
- Support ingredient lists with quantities
- Categorized by meal type (breakfast, lunch, dinner, snack, other)
- Include preparation time and instructions

### Meal Plans

- Group related meals together
- Specify duration and main goals
- Support different categories (Wellness, Fitness, Weight Management, etc.)

### Workouts

- Combine exercises into structured programs
- Specify difficulty level, duration, and frequency
- Target specific goals (Muscle Gain, Fat Loss, etc.)
- Support different workout types (Upper Body, Lower Body, Full Body)

## Important Notes

- The seed script will delete existing data before importing
- Make sure your database is properly configured and accessible
- All IDs are preserved from the original data to maintain relationships
