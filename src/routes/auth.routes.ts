import { Router } from "express";
import {
  login,
  logout,
  getProfile,
  compareLogin,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import {
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/login", validate(adminLoginSchema), login);
router.post("/compare", validate(adminLoginSchema), compareLogin);
router.post("/logout", logout);

router.get("/profile", authMiddleware, getProfile);

// Password management
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);

export default router;
