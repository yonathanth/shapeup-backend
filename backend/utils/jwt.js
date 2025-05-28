const jwt = require('jsonwebtoken');

// Generate a JWT token
const generateToken = (id, role, status) => {
  // Include both id and role in the token payload
  return jwt.sign({ id, role, status }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,  // Use the expiration time from your environment variable
  });
};

// Verify a JWT token
const verifyToken = (token) => {
  try {
    // Verify and decode the token
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Return null or throw a custom error if token is invalid
    return null; // You can also throw a custom error message if needed
  }
};

module.exports = { generateToken, verifyToken };
