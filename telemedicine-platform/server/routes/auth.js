const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const router = express.Router();

// Register route
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
      phone,
      specialization,
      licenseNumber,
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate role
    if (!["patient", "doctor", "agent", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Validate doctor-specific fields
    if (role === "doctor") {
      if (!specialization || !licenseNumber) {
        return res.status(400).json({
          error: "Specialization and license number are required for doctors",
        });
      }
    }

    // Create user object
    const userData = {
      email,
      password,
      role,
      profile: {
        name,
        phone,
      },
    };

    // Add role-specific fields
    if (role === "doctor") {
      userData.profile.specialization = specialization;
      userData.profile.licenseNumber = licenseNumber;
      userData.isActive = false; // Doctors need approval
    }

    // Generate agent code for agents
    if (role === "agent") {
      userData.profile.agentCode = `AG${Date.now().toString().slice(-6)}`;
    }

    // Create new user
    const newUser = new User(userData);
    await newUser.save();

    // Remove password from response
    const { password: _, ...userResponse } = newUser.toObject();

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account not active" });
    }

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();

    res.json({
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
