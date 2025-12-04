import express from "express";
import multer from "multer";
import { authJWT } from "../middleware/auth.js";
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
} from "../controllers/messageController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Load messages
router.get("/:chatId", authJWT, getMessages);

// Send message
router.post("/send", authJWT, upload.single("media"), sendMessage);

// Edit message
router.put("/:messageId", authJWT, editMessage);

// Delete message
router.delete("/:messageId", authJWT, deleteMessage);

// React to message
router.post("/:messageId/react", authJWT, reactToMessage);

export default router;
