const jwt = require("../utils/jwt"); // Import JWT utility

// Middleware to authenticate users
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  console.log("Token received:", token); // Log the token
  if (!token) {
    return res.status(401).json({ message: "Authentication token missing" });
  }

  const decoded = jwt.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = decoded; // Attach user data to the request object
  console.log("Authenticated user:", req.user); // Log the authenticated user
  next();
};

// Middleware to authorize users based on roles
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
