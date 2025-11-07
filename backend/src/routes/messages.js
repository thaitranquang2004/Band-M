import express from "express";
import multer from "multer";
import cloudinary from "cloudinary"; // Default import cho CommonJS
import { v2 as cloudinaryV2 } from "cloudinary"; // Nếu cần v2 explicit
import fs from "fs"; // Để xóa file temp sau upload
import { authJWT } from "../middleware/auth.js";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Load messages (pagination)
router.get("/:chatId", authJWT, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.participants.includes(req.user._id))
      return res.status(404).json({ message: "Chat not found" });

    const messages = await Message.find({
      chat: req.params.chatId,
      deletedAt: null,
    })
      .populate("sender", "username fullName avatar")
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const hasMore = messages.length === parseInt(limit);
    res.json({ messages: messages.reverse(), hasMore }); // Reverse for chronological
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Send message
router.post("/send", authJWT, upload.single("media"), async (req, res) => {
  try {
    const { chatId, content, type = "text" } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user._id))
      return res.status(400).json({ message: "Invalid chat" });

    let mediaUrl;
    if (req.file && type === "media") {
      const result = await cloudinaryV2.uploader.upload(req.file.path, {
        folder: "bandm/media",
      });
      mediaUrl = result.secure_url;
      // Xóa file temp
      fs.unlinkSync(req.file.path);
    }

    const message = new Message({
      chat: chatId,
      sender: req.user._id,
      content,
      type,
      mediaUrl,
    });
    await message.save();

    // Update unread for others
    chat.participants.forEach(async (participant) => {
      if (participant.toString() !== req.user._id.toString()) {
        await User.findByIdAndUpdate(participant, {
          $inc: { [`unreadCounts.${chatId}`]: 1 },
        });
      }
    });

    // Emit real-time
    req.io?.to(`chat_${chatId}`).emit("newMessage", {
      id: message._id,
      content: message.content, // Decrypt if needed in frontend
      sender: req.user._id,
      type,
      mediaUrl,
      createdAt: message.createdAt,
    });

    res.json({ messageId: message._id, message: "Sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Edit message
router.put("/:messageId", authJWT, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not owner" });

    message.content = req.body.content;
    message.isEdited = true;
    await message.save();

    req.io?.to(`chat_${message.chat}`).emit("messageEdited", {
      messageId: message._id,
      content: message.content,
    });

    res.json({ message: "Edited" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete message (soft)
router.delete("/:messageId", authJWT, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not owner" });

    message.deletedAt = new Date();
    await message.save();

    req.io
      ?.to(`chat_${message.chat}`)
      .emit("messageDeleted", { messageId: message._id });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
