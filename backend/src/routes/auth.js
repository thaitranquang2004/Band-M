import express from "express";
import { body, validationResult } from "express-validator";
import { authJWT } from "../middleware/auth.js";
import { validateRegister, validateLogin } from "../middleware/validate.js";
import {
  register,
  login,
  logout,
  refreshToken,
} from "../controllers/authController.js";

const router = express.Router();

// Register: Gắn middleware validate + controller
router.post("/register", validateRegister, register);

// Login: Gắn middleware + controller
router.post("/login", validateLogin, login);

// Logout: Gắn authJWT + controller
router.post("/logout", authJWT, logout);

// Refresh: Không cần authJWT (dùng cookie), gọi controller
router.post("/refresh", refreshToken);

export default router;
