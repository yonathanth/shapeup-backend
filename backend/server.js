const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const port = process.env.PORT || 5003;
const authRoutes = require("./routes/authRoutes"); // Import the authRoutes file
const { errorHandler } = require("./middleware/errorMiddleware");
const updateUserStatuses = require("./cron/updateUserStatuses"); // Import the cron job

dotenv.config(); // Load environment variables

const app = express();

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
const corsOptions = {
  origin: "*", // Allow all routes from this origin
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"], // Specify allowed methods if needed
  optionsSuccessStatus: 200, // For legacy browser support
};
app.use(cors(corsOptions));

// Static files
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Api Up and Running!");
});

// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", require("./routes/employeesRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/stock", require("./routes/stockRoutes"));
app.use("/api/finance", require("./routes/financialRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/members", require("./routes/membersRoutes"));
app.use("/api/memberManagement", require("./routes/memberManagementRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoute"));
app.use("/api/workouts", require("./routes/workoutRoutes"));
app.use("/api/exercises", require("./routes/exerciseRoutes"));
app.use("/api/meals", require("./routes/mealRoutes"));
app.use("/api/mealPlans", require("./routes/mealPlanRoutes"));
app.use("/api/markAsCompleted", require("./routes/exerciseCompletionRoute"));
app.use("/api/advertisement", require("./routes/advertisementRoutes"));
app.use("/api/broadcast", require("./routes/broadcastRoutes"));
app.use("/api/download", require("./routes/massDownloadRoute"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/nonActiveMembers", require("./routes/nonActiveMemberRoutes"));
app.use("/api/attendance", require("./routes/attendanceRecorderRoute"));
app.use("/api/staff", require("./routes/staffRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/users", require("./routes/userAnalyticsRoutes"));
// Define routes

app.use(
  "/api/subscriptionRequest",
  require("./routes/subscriptionRequestRoute")
);

// Error handling middleware
app.use(errorHandler);

// Initialize cron jobs
updateUserStatuses(); // Initialize the cron job
console.log("Cron job for updating user statuses initialized.");

// Start the server
app.listen(port, () => console.log(`Server started on port ${port}`));
