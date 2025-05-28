const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the folder exists
    const dir = "uploads/users/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit for user images
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif|webp|bmp|tiff|heic|heif/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// Helper function to calculate days between two dates
const calculateDaysBetween = (date1, date2) =>
  Math.ceil((date2 - date1) / (1000 * 3600 * 24));

// Helper function to validate date format (YYYY-MM-DD)
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString().split("T")[0];
};

// Helper function to calculate countdown
const calculateCountdown = (expirationDate, remainingDays) => {
  const today = new Date();
  const daysUntilExpiration = calculateDaysBetween(today, expirationDate);
  return Math.min(daysUntilExpiration, remainingDays);
};

const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      exercisesCompleted: true,
      attendance: true,
      workouts: true,
      bmis: true,
      notifications: true,
      mealPlans: true,
    },
  });
  res.status(200).json({
    success: true,
    data: { user },
  });
});

// Get all users with pagination and search
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 40;
  const search = req.query.search || "";
  const status = req.query.status || "";
  const service = req.query.service || "";
  const sortBy = req.query.sortBy || "createdAt"; // Default sort by registration date
  const sortOrder = req.query.sortOrder || "desc"; // Default sort order descending

  // Build the where clause for filtering
  const where = {
    role: "user",
    ...(search && {
      OR: [
        { fullName: { contains: search } },
        { phoneNumber: { contains: search } },
        { email: { contains: search } },
      ],
    }),
    ...(status && { status }),
    ...(service && { serviceId: service }),
  };

  // Get total count for pagination
  const total = await prisma.user.count({ where });

  // Build the orderBy clause
  let orderBy = {};
  switch (sortBy) {
    case "name":
      orderBy = { fullName: sortOrder };
      break;
    case "daysLeft":
      orderBy = { daysLeft: sortOrder };
      break;
    case "registrationDate":
      orderBy = { createdAt: sortOrder };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  // Get paginated users
  const users = await prisma.user.findMany({
    where,
    orderBy,
    include: {
      service: true,
      exercisesCompleted: true,
      attendance: true,
      workouts: true,
      bmis: true,
      notifications: true,
      mealPlans: true,
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Get all services for filter dropdown
  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        services,
      },
    },
  });
});

const addUser = [
  upload.single("profileImage"), // Middleware to handle image upload
  asyncHandler(async (req, res) => {
    const {
      fullName,
      gender,
      phoneNumber,
      email,
      address,
      dob,
      emergencyContact,
      startDate,
      height,
      weight,
      healthConditions,
      level,
      goal,
      status,
      freezeDate,
      serviceId,
      password,

      workouts,
      mealPlans,
      exercisesCompleted,
      lastWorkoutDate,
      currentStreak,
      highestStreak,
      notifications,
    } = req.body;

    const parsedHeight = height ? parseFloat(height) : undefined;
    const parsedWeight = weight ? parseFloat(weight) : undefined;

    // Calculate BMI if height and weight are provided
    const calculatedBmi =
      parsedHeight && parsedWeight ? parsedWeight / parsedHeight ** 2 : 0;
    const role = "user";
    // Default role to "user" if not provided
    const userRole =
      role &&
      (role === "admin" ||
        role === "user" ||
        role === "moderator" ||
        role === "root")
        ? role
        : "user";

    // Validate required fields
    if (
      !fullName ||
      !gender ||
      !phoneNumber ||
      !address ||
      !dob ||
      !emergencyContact ||
      !serviceId || // Make sure serviceId is provided
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
    }

    // Validate phone number format
    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits.",
      });
    }

    // Check if the phone number is already taken
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number is already taken.",
      });
    }

    // Validate date of birth format
    if (!isValidDate(dob)) {
      return res.status(400).json({
        success: false,
        message: "Date of birth must be in YYYY-MM-DD format.",
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure serviceId corresponds to an existing service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(400).json({
        success: false,
        message: `Invalid service ID: ${serviceId}.`,
      });
    }

    // Handle profile image upload
    let profileImageUrl = null;

    const profileImage = req.body.profileImage || (req.file && req.file.buffer);
    if (
      typeof profileImage === "string" &&
      profileImage.startsWith("data:image/")
    ) {
      // Handle Base64 Image
      try {
        const base64Data = profileImage.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Validate file size
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error("File size exceeds 10 MB limit.");
        }

        const dir = "uploads/users/";
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const fileName = `${Date.now()}_profileImage.png`; // Assume PNG
        const filePath = `${dir}${fileName}`;
        fs.writeFileSync(filePath, buffer);
        profileImageUrl = `/${filePath}`;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Error processing base64 image: ${error.message}`,
        });
      }
    } else if (req.file) {
      // Handle Binary File via Multer
      profileImageUrl = `/uploads/users/${req.file.filename}`;
    }

    const expirationDate = new Date(startDate || new Date());
    expirationDate.setDate(expirationDate.getDate() + service.period);
    const daysLeft = calculateCountdown(expirationDate, service.maxDays);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        gender,
        phoneNumber,
        email: email || null,
        address,
        dob: new Date(dob),
        emergencyContact,
        startDate: startDate ? new Date(startDate) : undefined,
        daysLeft,
        height: parsedHeight,
        weight: parsedWeight,
        level,
        goal,
        status,
        freezeDate: freezeDate ? new Date(freezeDate) : undefined,
        fingerprintTemplate: req.body.fingerprintTemplate || null, // Add fingerprint template
        serviceId: service.id, // Use the validated serviceId
        profileImageUrl,
        password: hashedPassword, // Save the hashed password
        role: userRole,
        workouts: {
          connect: workouts
            ? workouts.map((workoutId) => ({
                id: workoutId,
              }))
            : [],
        },
        mealPlans: {
          connect: mealPlans
            ? mealPlans.map((mealPlanId) => ({
                id: mealPlanId,
              }))
            : [],
        },
        exercisesCompleted: {
          connect: exercisesCompleted
            ? exercisesCompleted.map((exerciseCompletedId) => ({
                id: exerciseCompletedId,
              }))
            : [],
        },
        lastWorkoutDate: lastWorkoutDate ? new Date(lastWorkoutDate) : null,
        currentStreak,
        highestStreak,
        notifications: {
          connect: notifications
            ? notifications.map((notification) => ({
                id: notification.id,
              }))
            : [],
        }, //
      },
    });

    // Add initial BMI record
    await prisma.bmi.create({
      data: {
        userId: newUser.id,
        value: calculatedBmi,
      },
    });

    // Handle health conditions (if provided)
    if (healthConditions) {
      const parsedHealthConditions = JSON.parse(healthConditions);
      await prisma.healthCondition.create({
        data: {
          userId: newUser.id,
          ...parsedHealthConditions,
        },
      });
    }

    // Return a successful response
    res.status(201).json({
      success: true,
      message: "User added successfully.",
      data: newUser,
    });
  }),
];

// Edit a user by ID
const editUser = [
  upload.single("profileImage"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      fullName,
      gender,
      phoneNumber,
      email,
      address,
      dob,
      emergencyContact,
      startDate,
      height,
      weight,
      healthCondition,
      level,
      goal,
      status,
      freezeDate,
      serviceId,
      password,
      // workouts,
      exercisesCompleted,
      lastWorkoutDate,
      currentStreak,
      highestStreak,
      isComplete,
    } = req.body;
    const parsedHeight = height ? parseFloat(height) : undefined;
    const parsedWeight = weight ? parseFloat(weight) : undefined;

    // Find the user
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Validate DOB if provided
    if (dob && !isValidDate(dob)) {
      return res.status(400).json({
        success: false,
        message: "Date of birth must be in YYYY-MM-DD format.",
      });
    }

    // Validate unique phone number
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already taken.",
        });
      }
    }

    // Handle profile image upload
    let profileImageUrl = user.profileImageUrl;
    if (req.file) {
      // Delete old profile image if it exists
      if (profileImageUrl) {
        fs.unlink(path.join(__dirname, `../../${profileImageUrl}`), (err) => {
          if (err) {
            console.error("Error deleting old profile image:", err);
          } else {
            console.log("Old profile image deleted successfully.");
          }
        });
      }
      profileImageUrl = `/uploads/users/${req.file.filename}`;
    }

    // Retain existing password if not updated
    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Validate and retrieve service if serviceId is updated
    let service = null;

    if (serviceId) {
      service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        return res.status(400).json({
          success: false,
          message: `Invalid service ID: ${serviceId}.`,
        });
      }
    }
    console.log(parsedHeight, parsedWeight);
    // Append a new BMI if height or weight is changed
    if (
      (parsedHeight && parsedHeight !== user.height) ||
      (parsedWeight && parsedWeight !== user.weight)
    ) {
      console.log(parsedHeight, parsedWeight);

      const newBmi =
        parsedWeight && parsedHeight ? parsedWeight / parsedHeight ** 2 : 0;
      if (newBmi !== 0) {
        await prisma.bmi.create({
          data: {
            userId: user.id,
            value: newBmi,
          },
        });
      }
    }

    // Update user details
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName || user.fullName,
        gender: gender || user.gender,
        phoneNumber: phoneNumber || user.phoneNumber,
        email: email || user.email,
        address: address || user.address,
        dob: dob ? new Date(dob) : user.dob,
        emergencyContact: emergencyContact || user.emergencyContact,
        startDate: startDate ? new Date(startDate) : user.startDate,
        height: parsedHeight ?? user.height,
        weight: parsedWeight ?? user.weight,
        level: level || user.level,
        goal: goal || user.goal,
        status: status || user.status,
        freezeDate: freezeDate ? new Date(freezeDate) : user.freezeDate,
        fingerprintTemplate:
          req.body.fingerprintTemplate !== undefined
            ? req.body.fingerprintTemplate
            : user.fingerprintTemplate,
        service: serviceId
          ? { connect: { id: serviceId || user.serviceId } } // Correct way to update a relational field
          : undefined,
        profileImageUrl,
        password: hashedPassword,
        exercisesCompleted: exercisesCompleted
          ? {
              create: exercisesCompleted.map((exerciseCompletedId) => ({
                id: exerciseCompletedId,
              })),
            }
          : user.exercisesCompleted && user.exercisesCompleted.length > 0
          ? {
              create: user.exercisesCompleted.map((exerciseCompletedId) => ({
                id: exerciseCompletedId,
              })),
            }
          : undefined,

        lastWorkoutDate: lastWorkoutDate
          ? new Date(lastWorkoutDate)
          : user.lastWorkoutDate,
        currentStreak: currentStreak || user.currentStreak || 0,
        highestStreak: highestStreak || user.highestStreak || 0,
        isComplete: isComplete || user.isComplete,
      },
    });
    // Handle health conditions (if provided)
    if (healthCondition) {
      const parsedhealthCondition = JSON.parse(healthCondition);

      // Check if the user already has a health condition
      const existinghealthCondition = await prisma.healthCondition.findUnique({
        where: {
          userId: user.id, // Replace `userId` with the actual user ID being updated
        },
      });

      if (existinghealthCondition) {
        // Update the existing health condition
        await prisma.healthCondition.update({
          where: {
            userId: user.id, // Ensure this is the correct user ID
          },
          data: {
            ...parsedhealthCondition, // Spread the parsed health condition fields for update
          },
        });
      } else {
        // Create a new health condition if none exists
        await prisma.healthCondition.create({
          data: {
            userId: user.id, // Ensure the correct user ID is associated
            ...parsedhealthCondition,
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: updatedUser,
    });
  }),
];

// Delete a user by ID
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  if (user.profileImageUrl) {
    fs.unlink(path.join(__dirname, `../../${user.profileImageUrl}`), (err) => {
      if (err) {
        console.log("Error deleting file:", err);
      } else {
        console.log("File deleted successfully");
      }
    });
  }

  await prisma.user.delete({ where: { id } });
  res
    .status(200)
    .json({ success: true, message: "User deleted successfully." });
});

const addUserWorkout = asyncHandler(async (req, res) => {
  const { userId, workoutId, startedAt, progress, finishedAt } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
  });
  if (!workout) {
    return res
      .status(404)
      .json({ success: false, message: "Workout not found." });
  }

  // Check if the user already has the workout assigned
  const existingUserWorkout = await prisma.userWorkout.findFirst({
    where: {
      userId,
      workoutId,
    },
  });
  if (existingUserWorkout) {
    return res.status(400).json({
      success: false,
      message: "Workout is already added to the user.",
    });
  }

  // Create a new user workout record
  const userWorkout = await prisma.userWorkout.create({
    data: {
      userId,
      workoutId,
      startedAt: startedAt ? new Date(startedAt) : undefined,
      progress: progress !== undefined ? parseInt(progress) : null,
      finishedAt: finishedAt ? new Date(finishedAt) : null,
    },
  });

  // Fetch the user again with the related workout data (optional)
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      workouts: {
        where: { id: workoutId }, // Include the specific workout for this user
      },
    },
  });

  return res.status(201).json({
    success: true,
    message: "Workout added to user successfully.",
    data: {
      userWorkout,
      user: updatedUser, // Return the updated user with workouts
    },
  });
});

const addUserMealPlan = asyncHandler(async (req, res) => {
  const { userId, mealPlanId, startedAt, progress, finishedAt } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
  });
  if (!mealPlan) {
    return res
      .status(404)
      .json({ success: false, message: "Meal Plan not found." });
  }

  const existingUserMealPlan = await prisma.userMealPlan.findFirst({
    where: {
      userId,
      mealPlanId,
    },
  });
  if (existingUserMealPlan) {
    return res.status(400).json({
      success: false,
      message: "Workout is already added to the user.",
    });
  }

  const userMealPlan = await prisma.userMealPlan.create({
    data: {
      userId,
      mealPlanId,
      startedAt: startedAt ? new Date(startedAt) : undefined,
      progress: progress !== undefined ? parseInt(progress) : null,
      finishedAt: finishedAt ? new Date(finishedAt) : null,
    },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      mealPlans: {
        where: { id: mealPlanId }, // Include the specific workout for this user
      },
    },
  });

  return res.status(201).json({
    success: true,
    message: "Meal Plan added to user successfully.",
    data: userMealPlan,
    user: updatedUser,
  });
});

const getMyWorkouts = asyncHandler(async (req, res) => {
  const { id } = req.params; // userId
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    const userWorkouts = await prisma.userWorkout.findMany({
      where: { userId: id },
      include: {
        workout: {
          include: {
            exercises: true, // Include exercises in the workout
          },
        },
      },
    });

    const workouts = userWorkouts.map((userWorkout) => userWorkout.workout);

    res.status(200).json({
      success: true,
      data: workouts, // Return only the workouts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const getMyMealPlans = asyncHandler(async (req, res) => {
  const { id } = req.params; // userId
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const userMealPlans = await prisma.userMealPlan.findMany({
      where: { userId: id },
      include: {
        MealPlan: true,
      },
    });
    console.log(userMealPlans);
    const mealPlans = userMealPlans.map(
      (userMealPlan) => userMealPlan.MealPlan
    );

    res.status(200).json({
      success: true,
      data: mealPlans, // Return only the workouts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const updateNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(id); // User ID
  const { add, remove } = req.body; // Notifications to add or remove

  const user = await prisma.user.findUnique({ where: { id } });
  console.log(user);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  if (add && Array.isArray(add)) {
    for (const newNotification of add) {
      const { name, description } = newNotification;
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          message: "Each notification must include a name and a description.",
        });
      }

      await prisma.notification.create({
        data: {
          name,
          description,
          user: { connect: { id } },
        },
      });
    }
  }

  if (remove && Array.isArray(remove)) {
    await prisma.notification.deleteMany({
      where: {
        id: { in: remove },
        userId: id, // Ensure only notifications of this user are deleted
      },
    });
  }

  // Fetch updated notifications for the user
  const updatedNotifications = await prisma.notification.findMany({
    where: { userId: id },
  });

  res.status(200).json({
    success: true,
    message: "Notifications updated successfully.",
    data: updatedNotifications,
  });
});

// Update user's fingerprint template
const updateFingerprintTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { templateBase64 } = req.body;

  if (!templateBase64) {
    res.status(400);
    throw new Error("Fingerprint template is required");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fingerprintTemplate: templateBase64,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Fingerprint template updated successfully",
      data: {
        userId: updatedUser.id,
        hasFingerprint: !!updatedUser.fingerprintTemplate,
      },
    });
  } catch (error) {
    res.status(400);
    throw new Error(`Failed to update fingerprint template: ${error.message}`);
  }
});

module.exports = {
  getUsers,
  getUserDetails,
  addUser,
  editUser,
  deleteUser,
  getMyWorkouts,
  getMyMealPlans,
  addUserWorkout,
  addUserMealPlan,
  updateNotification,
  updateFingerprintTemplate,
};
