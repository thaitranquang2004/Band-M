import express from "express";
import multer from "multer";
import cloudinary from "cloudinary"; // Default import cho CommonJS
import { v2 as cloudinaryV2 } from "cloudinary"; // Nếu cần v2 explicit
import fs from "fs"; // Để xóa file temp sau upload
import path from "path";
import { authJWT } from "../middleware/auth.js";
import User from "../models/User.js";
import {
  validateProfileUpdate,
  validateUserSearch,
} from "../middleware/validate.js"; // Integrate validation mới

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temp folder cho files

// Get profile (ERD: full fields trừ password)
router.get("/profile", authJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile (multipart cho avatar)
router.put(
  "/profile",
  authJWT,
  validateProfileUpdate,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const updates = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        dob: req.body.dob,
      };

      // Upload avatar nếu có file
      if (req.file) {
        const result = await cloudinaryV2.uploader.upload(req.file.path, {
          folder: "bandm/avatars", // Organize trong Cloudinary
          transformation: [{ width: 200, height: 200, crop: "fill" }], // Resize avatar
        });
        updates.avatar = result.secure_url;

        // Xóa file temp
        fs.unlinkSync(req.file.path);
      }

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
      }).select("-password");
      if (!user) return res.status(404).json({ message: "User not found" });

      // Emit Socket notify friends (optional, như flowchart)
      req.io?.emit("userProfileUpdated", {
        userId: user._id,
        fullName: user.fullName,
        avatar: user.avatar,
      });

      res.json({ message: "Updated", user });
    } catch (err) {
      // Cleanup nếu upload fail
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Search users (query param, populate onlineStatus từ Socket nếu cần)
router.get("/search", authJWT, validateUserSearch, async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } },
      ],
      _id: { $ne: req.user._id }, // Exclude self
    })
      .select("id username fullName avatar onlineStatus")
      .limit(10);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
