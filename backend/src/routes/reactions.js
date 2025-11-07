import express from "express";
import { authJWT } from "../middleware/auth.js";
import MessageReaction from "../models/MessageReaction.js";
import MessageSeen from "../models/MessageSeen.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

// Add reaction
router.post("/:messageId/reaction", authJWT, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Not found" });

    // Upsert reaction
    await MessageReaction.findOneAndUpdate(
      { message: req.params.messageId, user: req.user._id },
      { reactionType },
      { upsert: true, new: true }
    );

    req.io?.to(`chat_${message.chat}`).emit("newReaction", {
      messageId: req.params.messageId,
      userId: req.user._id,
      reactionType,
    });

    res.json({ message: "Added" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark seen
router.put("/:messageId/seen", authJWT, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Not found" });

    // Upsert seen
    await MessageSeen.findOneAndUpdate(
      { message: req.params.messageId, user: req.user._id },
      { seenAt: new Date() },
      { upsert: true }
    );

    // Reduce unread count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { [`unreadCounts.${message.chat}`]: -1 },
    });

    req.io
      ?.to(`chat_${message.chat}`)
      .emit("messageSeen", {
        messageId: req.params.messageId,
        userId: req.user._id,
      });

    res.json({ message: "Seen" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
