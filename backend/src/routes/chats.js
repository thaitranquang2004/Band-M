import express from "express";
import { authJWT } from "../middleware/auth.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";

const router = express.Router();

// Create chat
router.post("/create", authJWT, async (req, res) => {
  try {
    const { type, participants, name } = req.body;
    if (type === "group" && (!name || participants.length < 2))
      return res.status(400).json({ message: "Invalid group" });

    const chat = new Chat({
      type,
      name: type === "group" ? name : undefined,
      participants: [...participants, req.user._id],
    });
    await chat.save();

    res.json({ chatId: chat._id, message: "Created" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Invite to group
router.post("/:chatId/invite", authJWT, async (req, res) => {
  try {
    const { userIds } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    // Check if user is participant
    if (!chat.participants.includes(req.user._id))
      return res.status(403).json({ message: "Not authorized" });

    chat.participants.push(...userIds);
    await chat.save();

    userIds.forEach((userId) => {
      req.io?.to(userId.toString()).emit("chatInvite", { chatId: chat._id });
    });

    res.json({ message: "Invited" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// List chats (preview)
router.get("/", authJWT, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    // Aggregate: join participants, last message, unread
    const chats = await Chat.aggregate([
      { $match: { participants: req.user._id } },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "chat",
          as: "lastMsg",
          pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
        },
      },
      {
        $addFields: {
          lastMessageTime: { $arrayElemAt: ["$lastMsg.createdAt", 0] },
          unreadCount: {
            $ifNull: [
              {
                $getField: {
                  field: req.user._id.toString(),
                  input: "$unreadCounts",
                },
              },
              0,
            ],
          },
        },
      },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          type: 1,
          participants: 1,
          lastMessageTime: 1,
          unreadCount: 1,
        },
      },
    ]);
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
