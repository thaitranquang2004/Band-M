import Chat from "../models/Chat.js";
import User from "../models/User.js";

// Create chat
export const createChat = async (req, res) => {
  try {
    const { type, participants, name } = req.body;
    if (type === "group" && (!name || participants.length < 2))
      return res.status(400).json({ message: "Invalid group" });

    // Enforce friendship for direct chats
    if (type === "direct") {
      const otherUserId = participants[0];
      const currentUser = await User.findById(req.user._id);
      if (!currentUser.friends.includes(otherUserId)) {
        return res
          .status(403)
          .json({ message: "You can only message friends" });
      }

      const existingChat = await Chat.findOne({
        type: "direct",
        participants: { $all: [...participants, req.user._id], $size: 2 },
      });
      if (existingChat) {
        return res.json({
          chatId: existingChat._id.toString(),
          message: "Existing chat returned",
        });
      }
    }

    const chat = new Chat({
      type,
      name: type === "group" ? name : undefined,
      participants: [...participants, req.user._id],
    });
    await chat.save();
    res.json({ chatId: chat._id.toString(), message: "Created" });
  } catch (err) {
    console.error("Error in createChat:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Invite to group
export const inviteToGroup = async (req, res) => {
  try {
    const { userIds } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

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
};

// List chats
export const listChats = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
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
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "participants",
          pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
        },
      },
      {
        $project: {
          _id: { $toString: "$_id" },
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
    console.error("Error in listChats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single chat details
export const getChatDetails = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate(
      "participants",
      "username fullName avatar"
    );

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if participant
    if (
      !chat.participants.some(
        (p) => p._id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ chat });
  } catch (err) {
    console.error("Error in getChatDetails:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
