"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const authMiddleware = (req, res, next) => {
    try {
        // const authHeader = req.headers.authorization;
        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //   res.status(401).json({ success: false, message: 'No token provided' });
        //   return;
        // }
        // const token = authHeader.split(' ')[1];
        const token = req.cookies?.parkpro_token;
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.adminId = decoded.id;
        next();
    }
    catch (error) {
        res
            .status(401)
            .json({ success: false, message: "Invalid or expired token" });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map