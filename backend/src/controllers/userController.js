import User from "../models/User.js";
import { v2 as cloudinaryV2 } from "cloudinary";
import fs from "fs";

// Get profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      dob: req.body.dob,
    };

    // Upload avatar nếu có file
    if (req.file) {
      const result = await cloudinaryV2.uploader.upload(req.file.path, {
        folder: "bandm/avatars",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
      });
      updates.avatar = result.secure_url;

      // Xóa file temp
      fs.unlinkSync(req.file.path);
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Emit Socket notify friends
    req.io?.emit("userProfileUpdated", {
      userId: user._id,
      fullName: user.fullName,
      avatar: user.avatar,
    });

    res.json({ message: "Updated", user });
  } catch (err) {
    // Cleanup nếu upload fail
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Server error" });
  }
};

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } },
      ],
      _id: { $ne: req.user._id },
    })
      .select("id username fullName avatar onlineStatus")
      .limit(10);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
