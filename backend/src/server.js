import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import { v2 as cloudinaryV2 } from "cloudinary";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";

dotenv.config();

// Config Cloudinary (từ .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB error:", err);
    process.exit(1); // Exit nếu DB fail
  });

// Middleware
app.use(helmet());
app.use(morgan("combined"));
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limit
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
});
app.use("/api", limiter);

// Pass io to req for Socket emits in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes (relative paths từ src/)
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import friendRoutes from "./routes/friends.js";
import chatRoutes from "./routes/chats.js";
import messageRoutes from "./routes/messages.js";
import reactionRoutes from "./routes/reactions.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reactions", reactionRoutes);

// Socket.io Setup
import("./sockets/index.js").then(({ default: setupSockets }) => {
  setupSockets(io);
});

// Error Handler (import relative)
import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

// ========== PRODUCTION: Serve Frontend Static Files ==========
if (process.env.NODE_ENV === "production") {
  const frontendDistPath = path.join(__dirname, "../../frontend/dist");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("Serving static from:", frontendDistPath);

  if (!fs.existsSync(frontendDistPath)) {
    console.error(
      "ERROR: frontend/dist not found! Run 'npm run build' in frontend."
    );
    // Optional: Tạo placeholder để tránh crash
    app.get("*", (req, res) =>
      res.status(500).json({
        message: "Frontend not built. Run 'cd frontend && npm run build'",
      })
    );
  } else {
    console.log("Frontend dist found OK!");

    // Serve static assets TRƯỚC fallback
    app.use(
      express.static(frontendDistPath, {
        index: false, // Không auto index.html cho subdirs
      })
    );
    console.log("Static middleware registered");

    // Fallback: Handle SPA routes (root + /chat/:id, etc.) - CHỈ non-API
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "API not found" }); // Catch API 404 ở đây
      }
      const indexPath = path.join(frontendDistPath, "index.html");
      console.log("Serving index.html for path:", req.path);
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      } else {
        console.error("index.html not found at:", indexPath);
        return res.status(404).json({ message: "Frontend not built" });
      }
    });
  }
} else {
  console.log("Running in DEV mode - No frontend serve");
}

// ========== 404 Handler CUỐI CÙNG: Chỉ cho unmatched API/static ==========
app.use((req, res) => {
  console.log("Final 404 hit for:", req.path); // Debug
  res.status(404).json({ message: "Not found" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
