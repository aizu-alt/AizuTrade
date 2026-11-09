import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler as h } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  login,
  register,
  me,
  forgotPassword,
  resetPassword,
  updatePassword,
  sendVerification,
  verifyEmail,
  verifyEmailOtp,
} from "../controllers/authController.js";

const limit = (max, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { message },
  });

const router = Router();
router.post("/login", limit(20, "Too many attempts. Please try again in 15 minutes."), h(login));
router.post("/register", limit(10, "Too many registration attempts. Please try again later."), h(register));
router.post("/forgot", limit(5, "Too many reset requests. Please try again in 15 minutes."), h(forgotPassword));
router.post("/reset", limit(10, "Too many attempts. Please try again in 15 minutes."), h(resetPassword));
router.post("/update-password", requireAuth, h(updatePassword));
router.post("/send-verification", requireAuth, h(sendVerification));
router.post("/verify-email-otp", requireAuth, h(verifyEmailOtp));
router.get("/verify-email", h(verifyEmail));
router.get("/me", requireAuth, me);

export default router;
