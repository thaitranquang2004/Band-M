import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { v2 as cloudinaryV2 } from "cloudinary";
import fs from "fs";
import CryptoJS from "crypto-js";

// Helper to decrypt
const decryptMessage = (content) => {
  try {
    const bytes = CryptoJS.AES.decrypt(
      content,
      process.env.ENCRYPT_SECRET || "default_secret"
    );
    return bytes.toString(CryptoJS.enc.Utf8) || content;
  } catch (e) {
    return content;
  }
};

// Load messages
export const getMessages = async (req, res) => {
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

    // Decrypt messages
    const decryptedMessages = messages.map((msg) => {
      const msgObj = msg.toObject();
      if (msgObj.type === "text") {
        msgObj.content = decryptMessage(msgObj.content);
      }
      return msgObj;
    });

    const hasMore = messages.length === parseInt(limit);
    res.json({ messages: decryptedMessages.reverse(), hasMore });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Send message
export const sendMessage = async (req, res) => {
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

    // Populate sender for emit
    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username fullName avatar"
    );

    // Emit real-time
    const messageData = {
      _id: message._id,
      id: message._id,
      chat: chatId,
      content: content,
      sender: populatedMessage.sender,
      type,
      mediaUrl,
      createdAt: message.createdAt,
    };

    // Emit to chat room
    req.io?.to(`chat_${chatId}`).emit("newMessage", messageData);

    res.json({ messageId: message._id, message: "Sent" });
  } catch (err) {
    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Server error" });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not owner" });

    message.content = req.body.content;
    message.isEdited = true;
    await message.save();

    req.io?.to(`chat_${message.chat}`).emit("messageEdited", {
      messageId: message._id,
      content: req.body.content,
    });

    res.json({ message: "Edited" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
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
};
// React to message
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Check if user already reacted with this type
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString() && r.type === type
    );

    if (existingReactionIndex > -1) {
      // Remove reaction (toggle off)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ user: userId, type });
    }

    await message.save();

    const populatedMessage = await Message.findById(messageId).populate(
      "reactions.user",
      "username fullName avatar"
    );

    const reactionData = {
      messageId,
      reactions: populatedMessage.reactions,
    };

    req.io
      ?.to(`chat_${message.chat}`)
      .emit("messageReactionUpdate", reactionData);

    res.json(reactionData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark seen
// export const markSeen = async (req, res) => {
//   try {
//     const message = await Message.findById(req.params.messageId);
//     if (!message) return res.status(404).json({ message: "Not found" });

//     // Upsert seen
//     await MessageSeen.findOneAndUpdate(
//       { message: req.params.messageId, user: req.user._id },
//       { seenAt: new Date() },
//       { upsert: true }
//     );

//     // Reduce unread count
//     await User.findByIdAndUpdate(req.user._id, {
//       $inc: { [`unreadCounts.${message.chat}`]: -1 },
//     });

//     req.io
//       ?.to(`chat_${message.chat}`)
//       .emit("messageSeen", {
//         messageId: req.params.messageId,
//         userId: req.user._id,
//       });

//     res.json({ message: "Seen" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };
