"use strict";
// import { Request, Response, NextFunction } from 'express';
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, _req, res, _next) => {
    const isDev = process.env.NODE_ENV === "development";
    // Normalize error
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const status = err instanceof AppError ? err.status : "error";
    // DEV MODE (detailed)
    if (isDev) {
        console.error("❌ ERROR:", err);
        res.status(statusCode).json({
            success: false,
            status,
            message: err.message,
            stack: err.stack,
        });
        return;
    }
    // PROD MODE (clean)
    if (err instanceof AppError && err.isOperational) {
        res.status(statusCode).json({
            success: false,
            status,
            message: err.message,
        });
        return;
    }
    // Unknown errors
    console.error("🔥 CRITICAL ERROR:", err);
    res.status(500).json({
        success: false,
        status: "error",
        message: "Something went wrong",
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map