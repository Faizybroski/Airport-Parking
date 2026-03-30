"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_1 = require("../middleware/validate");
const validators_1 = require("../validators");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/admin/login — Admin login
router.post("/login", (0, validate_1.validate)(validators_1.adminLoginSchema), auth_controller_1.login);
router.post("/logout", auth_controller_1.logout);
// GET /api/admin/profile — Get admin profile
router.get("/profile", auth_1.authMiddleware, auth_controller_1.getProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map