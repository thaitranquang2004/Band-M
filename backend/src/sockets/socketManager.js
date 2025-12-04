import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { userHandler } from "./handlers/userHandler.js";
import { chatHandler } from "./handlers/chatHandler.js";

export const setupSockets = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const bearerToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket auth failed:", err.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Initialize handlers
    const { handleUserOffline, handleJoinMyChats } = userHandler(io, socket);
    chatHandler(io, socket);

    // Auto-join chats sau connect
    handleJoinMyChats();

    // Global disconnect handler
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      try {
        await handleUserOffline();
      } catch (err) {
        console.error("Disconnect handler error:", err);
      }
    });
  });
};