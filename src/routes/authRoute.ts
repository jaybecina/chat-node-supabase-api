import { Router } from "express";
import { login, register, logout } from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Authentication routes
router.post("/login", login);
router.post("/register", register);
router.post("/logout", authenticate, logout);

export default router;
