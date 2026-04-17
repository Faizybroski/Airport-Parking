import { Router } from "express";
import { login, logout, getProfile, compareLogin } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { adminLoginSchema } from "../validators";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /api/admin/login — Admin login
router.post("/login", validate(adminLoginSchema), login);
router.post("/compare", validate(adminLoginSchema), compareLogin);
router.post("/logout", logout);

// GET /api/admin/profile — Get admin profile
router.get("/profile", authMiddleware, getProfile);

export default router;
