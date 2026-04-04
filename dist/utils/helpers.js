"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPrice = exports.formatDayCount = exports.formatDuration = exports.calculateChargeableDays = exports.calculateHours = exports.generateTrackingNumber = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a unique tracking number: PPK-XXXXXX
 */
const generateTrackingNumber = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "PPK-";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(crypto_1.default.randomInt(chars.length));
    }
    return result;
};
exports.generateTrackingNumber = generateTrackingNumber;
/**
 * Calculate hours between two dates
 */
const calculateHours = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
};
exports.calculateHours = calculateHours;
/**
 * Convert a date range into billable days using whole-day charging.
 */
const calculateChargeableDays = (start, end) => {
    const hours = (0, exports.calculateHours)(start, end);
    if (hours <= 0) {
        return 0;
    }
    return Math.max(1, Math.ceil(hours / 24));
};
exports.calculateChargeableDays = calculateChargeableDays;
/**
 * Format duration to readable string
 */
const formatDuration = (hours) => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (days === 0)
        return `${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
    if (remainingHours === 0)
        return `${days} day${days !== 1 ? "s" : ""}`;
    return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
};
exports.formatDuration = formatDuration;
const formatDayCount = (days) => `${days} day${days !== 1 ? "s" : ""}`;
exports.formatDayCount = formatDayCount;
/**
 * Format currency (GBP)
 */
const formatPrice = (price) => {
    return `Â£${price.toFixed(2)}`;
};
exports.formatPrice = formatPrice;
//# sourceMappingURL=helpers.js.map