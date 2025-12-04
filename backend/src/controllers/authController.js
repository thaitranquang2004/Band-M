// src/modules/auth/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Register: Tạo user mới, hash pw, generate tokens, set refresh cookie
export const register = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, dob } = req.body;

    // Check existing user (unique username/email)
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ message: "Username/Email exists" });
    }

    // Tạo user
    const user = new User({ username, password, fullName, email, phone, dob });
    await user.save();

    // Generate JWT tokens
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE, // '15m'
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE, // '7d'
    });

    // Set HttpOnly cookie cho refreshToken
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(201).json({ message: "Success", userId: user._id });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login: Verify pw, generate tokens, set cookie, return user info
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Tìm user và verify pw
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE,
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });

    // Set cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout: Clear refresh cookie
export const logout = async (req, res) => {
  console.log("Logout, clearing cookie");
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logout success" });
};

// Refresh
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    // Verify và lấy user
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh" });
    }

    // Generate new accessToken
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE,
    });

    res.json({ accessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(401).json({ message: "Refresh invalid" });
  }
};
