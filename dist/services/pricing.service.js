"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingService = exports.DAY_31_PLUS_INCREMENT = exports.DAY_11_TO_30_INCREMENT = exports.FIRST_TEN_DAYS_COUNT = void 0;
const PricingConfig_1 = require("../models/PricingConfig");
const helpers_1 = require("../utils/helpers");
const errorHandler_1 = require("../middleware/errorHandler");
exports.FIRST_TEN_DAYS_COUNT = 10;
exports.DAY_11_TO_30_INCREMENT = 3;
exports.DAY_31_PLUS_INCREMENT = 2;
const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;
const normalizeFirstTenDayPrices = (prices) => prices.slice(0, exports.FIRST_TEN_DAYS_COUNT).map((price) => roundToTwoDecimals(price));
const deriveLegacyFirstTenDayPrices = (config) => {
    if (Array.isArray(config.firstTenDayPrices) &&
        config.firstTenDayPrices.length === exports.FIRST_TEN_DAYS_COUNT) {
        return normalizeFirstTenDayPrices(config.firstTenDayPrices);
    }
    const legacyHourlyPrice = config.pricePerHour ?? 0;
    return Array.from({ length: exports.FIRST_TEN_DAYS_COUNT }, (_, index) => roundToTwoDecimals(legacyHourlyPrice * 24 * (index + 1)));
};
class PricingService {
    getPricingSnapshot(firstTenDayPrices) {
        return {
            firstTenDayPrices: normalizeFirstTenDayPrices(firstTenDayPrices),
            day11To30Increment: exports.DAY_11_TO_30_INCREMENT,
            day31PlusIncrement: exports.DAY_31_PLUS_INCREMENT,
        };
    }
    isDailySnapshot(snapshot) {
        return (Array.isArray(snapshot?.firstTenDayPrices) &&
            snapshot.firstTenDayPrices.length === exports.FIRST_TEN_DAYS_COUNT);
    }
    calculateTotalPriceForDays(totalDays, snapshot) {
        if (totalDays <= 0) {
            return 0;
        }
        if (totalDays <= exports.FIRST_TEN_DAYS_COUNT) {
            return roundToTwoDecimals(snapshot.firstTenDayPrices[totalDays - 1] ?? 0);
        }
        const dayTenPrice = snapshot.firstTenDayPrices[exports.FIRST_TEN_DAYS_COUNT - 1] ?? 0;
        const daysFrom11To30 = Math.min(totalDays, 30) - exports.FIRST_TEN_DAYS_COUNT;
        const daysFrom31Plus = Math.max(0, totalDays - 30);
        return roundToTwoDecimals(dayTenPrice +
            daysFrom11To30 * snapshot.day11To30Increment +
            daysFrom31Plus * snapshot.day31PlusIncrement);
    }
    /**
     * Get current pricing config
     */
    async getConfig(businessId) {
        const config = await PricingConfig_1.PricingConfig.findOne({ businessId }).sort({
            createdAt: -1,
        });
        if (!config) {
            throw new errorHandler_1.AppError("Pricing config not found. Please seed the database.", 500);
        }
        if (!Array.isArray(config.firstTenDayPrices) ||
            config.firstTenDayPrices.length !== exports.FIRST_TEN_DAYS_COUNT) {
            config.firstTenDayPrices = deriveLegacyFirstTenDayPrices(config);
        }
        return config;
    }
    /**
     * Update or create pricing config
     */
    async updateConfig(businessId, firstTenDayPrices) {
        if (firstTenDayPrices.length !== exports.FIRST_TEN_DAYS_COUNT) {
            throw new errorHandler_1.AppError("Exactly 10 day prices are required.", 400);
        }
        const normalizedPrices = normalizeFirstTenDayPrices(firstTenDayPrices);
        let config = await PricingConfig_1.PricingConfig.findOne({ businessId }).sort({
            createdAt: -1,
        });
        if (config) {
            config.firstTenDayPrices = normalizedPrices;
            config.pricePerHour = undefined;
            config.discountRules = undefined;
            await config.save();
        }
        else {
            config = await PricingConfig_1.PricingConfig.create({
                businessId,
                firstTenDayPrices: normalizedPrices,
            });
        }
        return config;
    }
    /**
     * Calculate price for a booking
     */
    async calculatePrice(businessId, startTime, endTime) {
        const config = await this.getConfig(businessId);
        const snapshot = this.getPricingSnapshot(config.firstTenDayPrices);
        const totalHours = (0, helpers_1.calculateHours)(startTime, endTime);
        const totalDays = (0, helpers_1.calculateChargeableDays)(startTime, endTime);
        const finalPrice = this.calculateTotalPriceForDays(totalDays, snapshot);
        return {
            totalHours: roundToTwoDecimals(totalHours),
            totalDays,
            basePrice: finalPrice,
            finalPrice,
            ...snapshot,
        };
    }
    /**
     * Calculate extra daily charges for late pickup.
     */
    calculateOvertime(bookedStartTime, bookedEndTime, actualExitTime, originalPrice, snapshot, bookedDays) {
        const bookedHours = (0, helpers_1.calculateHours)(bookedStartTime, bookedEndTime);
        const actualHours = (0, helpers_1.calculateHours)(bookedStartTime, actualExitTime);
        const normalizedBookedDays = bookedDays ?? (0, helpers_1.calculateChargeableDays)(bookedStartTime, bookedEndTime);
        const actualDays = (0, helpers_1.calculateChargeableDays)(bookedStartTime, actualExitTime);
        const overtimeDays = Math.max(0, actualDays - normalizedBookedDays);
        const newTotalPrice = this.calculateTotalPriceForDays(actualDays, snapshot);
        const overtimePrice = roundToTwoDecimals(Math.max(0, newTotalPrice - originalPrice));
        return {
            bookedHours: roundToTwoDecimals(bookedHours),
            actualHours: roundToTwoDecimals(actualHours),
            bookedDays: normalizedBookedDays,
            actualDays,
            overtimeDays,
            overtimePrice,
            newTotalPrice: roundToTwoDecimals(newTotalPrice),
        };
    }
    /**
     * Legacy hourly overtime calculation kept for older bookings created before
     * the day-based tariff migration.
     */
    calculateLegacyOvertime(bookedStartTime, bookedEndTime, actualExitTime, originalPrice, pricePerHour) {
        const bookedHours = (0, helpers_1.calculateHours)(bookedStartTime, bookedEndTime);
        const actualHours = (0, helpers_1.calculateHours)(bookedStartTime, actualExitTime);
        const overtimeHours = (0, helpers_1.calculateHours)(bookedEndTime, actualExitTime);
        const overtimePrice = roundToTwoDecimals(overtimeHours * pricePerHour);
        const newTotalPrice = roundToTwoDecimals(originalPrice + overtimePrice);
        const bookedDays = (0, helpers_1.calculateChargeableDays)(bookedStartTime, bookedEndTime);
        const actualDays = (0, helpers_1.calculateChargeableDays)(bookedStartTime, actualExitTime);
        return {
            bookedHours: roundToTwoDecimals(bookedHours),
            actualHours: roundToTwoDecimals(actualHours),
            bookedDays,
            actualDays,
            overtimeDays: Math.max(0, actualDays - bookedDays),
            overtimePrice,
            newTotalPrice,
        };
    }
}
exports.pricingService = new PricingService();
//# sourceMappingURL=pricing.service.js.map