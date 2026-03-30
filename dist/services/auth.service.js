"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = require("../models/Admin");
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
class AuthService {
    /**
     * Admin login
     */
    async login(email, password) {
        const admin = await Admin_1.Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            throw new errorHandler_1.AppError("Invalid email or password", 401);
        }
        const isMatch = await bcryptjs_1.default.compare(password, admin.password);
        if (!isMatch) {
            throw new errorHandler_1.AppError("Invalid email or password", 401);
        }
        // const token = jwt.sign({ id: admin._id }, config.jwtSecret, {
        //   expiresIn: config.jwtExpiresIn,
        // } as jwt.SignOptions);
        const token = jsonwebtoken_1.default.sign({ id: admin._id }, // or however your data looks
        config_1.config.jwtSecret, { expiresIn: "7d" });
        return {
            token,
            admin: {
                _id: admin._id,
                email: admin.email,
                name: admin.name,
            },
        };
    }
    /**
     * Get admin by ID
     */
    async getAdminById(id) {
        return await Admin_1.Admin.findById(id).select("-password");
    }
}
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map