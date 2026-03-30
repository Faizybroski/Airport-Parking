"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.logout = exports.login = void 0;
const auth_service_1 = require("../services/auth.service");
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await auth_service_1.authService.login(email, password);
        const environment = process.env.environment;
        res.cookie("parkpro_token", result.token, {
            httpOnly: true,
            secure: environment === "production",
            sameSite: environment === "production" ? "none" : "lax",
            path: "/",
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const logout = async (req, res, next) => {
    try {
        res.clearCookie("parkpro_token");
        res.json({ success: true, message: "Logged out successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const getProfile = async (req, res, next) => {
    try {
        const admin = await auth_service_1.authService.getAdminById(req.adminId);
        res.json({ success: true, data: admin });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
//# sourceMappingURL=auth.controller.js.map