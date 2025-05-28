const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Register a new user
const register = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            phoneNumber,
            serviceId,
            gender,
            address,
            dob,
            emergencyContact
        } = req.body;

        // Check for required fields
        if (
            !fullName ||
            !email ||
            !password ||
            !phoneNumber ||
            !serviceId ||
            !gender ||
            !address ||
            !dob ||
            !emergencyContact
        ) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Validate date of birth
        const formattedDob = new Date(dob);
        if (isNaN(formattedDob.getTime())) {
            return res.status(400).json({ error: "Invalid date format for dob." });
        }

        // Check if email already exists
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ error: "Email is already registered." });
        }

        // Check if phone number is already taken
        const phoneExists = await prisma.user.findUnique({ where: { phoneNumber } });
        if (phoneExists) {
            return res.status(400).json({ error: "Phone number is already registered." });
        }

        // Ensure serviceId corresponds to an existing service
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) {
            return res.status(400).json({ error: `Invalid service ID: ${serviceId}.` });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Log the role being used during registration (for debugging)
        console.log('Registering user with role: user'); 

        // Create the new user
        const newUser = await prisma.user.create({
            data: {
                fullName,
                email,
                password: hashedPassword,
                phoneNumber,
                serviceId: service.id,
                gender,
                address,
                dob: formattedDob,
                emergencyContact,
                role: 'user', // Set the default role for a new user
            },
        });

        // Log the new user details (for debugging)
        console.log('New user created:', newUser);

        // Generate token with role included
        const token = generateToken(newUser.id, newUser.role);

        return res.status(201).json({ message: "User registered successfully.", token });
    } catch (error) {
        console.error("Error in register function:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

// Login existing user
const login = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Validate input
        if (!phoneNumber || !password) {
            return res.status(400).json({ error: "Phone number and password are required." });
        }

        // Find user by phone number
        const user = await prisma.user.findUnique({
            where: {
                phoneNumber: phoneNumber,
            },
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid credentials." });
        }

        // Validate password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ error: "Invalid credentials." });
        }

        // Log the user details (for debugging)
        console.log('User login successful:', user);

        // Make sure role is included when generating token
        const token = generateToken(user.id, user.role, user.status);

        return res.status(200).json({ message: "Login successful.", token });
    } catch (error) {
        console.error("Error in login function:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

module.exports = { register, login };
