import express from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authJWT } from "../middleware/auth.js";
import { validateRegister, validateLogin } from "../middleware/validate.js";

const router = express.Router();

// Register
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { username, password, fullName, email, phone, dob } = req.body;
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing)
      return res.status(400).json({ message: "Username/Email exists" });

    const user = new User({ username, password, fullName, email, phone, dob });
    await user.save();

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE,
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });

    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    res.status(201).json({ message: "Success", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE,
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });

    // Set cookie HttpOnly cho refreshToken
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure=true trên Render
      sameSite: "strict",
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Logout
router.post("/logout", authJWT, async (req, res) => {
  console.log("Logout, clearing cookie"); // Debug
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logout success" });
});

// Refresh
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Invalid refresh" });

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE,
    });
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: "Refresh invalid" });
  }
});

export default router;
