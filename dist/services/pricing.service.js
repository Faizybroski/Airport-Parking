"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingService = void 0;
const PricingConfig_1 = require("../models/PricingConfig");
const helpers_1 = require("../utils/helpers");
const errorHandler_1 = require("../middleware/errorHandler");
class PricingService {
    /**
     * Get current pricing config
     */
    async getConfig(businessId) {
        // const config = await PricingConfig.findOne().sort({ createdAt: -1 });
        const config = await PricingConfig_1.PricingConfig.findOne({ businessId }).sort({
            createdAt: -1,
        });
        if (!config) {
            throw new errorHandler_1.AppError("Pricing config not found. Please seed the database.", 500);
        }
        return config;
    }
    /**
     * Update or create pricing config
     */
    async updateConfig(businessId, pricePerHour, discountRules) {
        // Sort discount rules by minDays ascending
        const sortedRules = [...discountRules].sort((a, b) => a.minDays - b.minDays);
        let config = await PricingConfig_1.PricingConfig.findOne({ businessId }).sort({
            createdAt: -1,
        });
        if (config) {
            config.pricePerHour = pricePerHour;
            config.discountRules = sortedRules;
            await config.save();
        }
        else {
            config = await PricingConfig_1.PricingConfig.create({
                businessId,
                pricePerHour,
                discountRules: sortedRules,
            });
        }
        return config;
    }
    /**
     * Calculate price for a booking
     */
    async calculatePrice(businessId, startTime, endTime) {
        const config = await this.getConfig(businessId);
        const totalHours = (0, helpers_1.calculateHours)(startTime, endTime);
        const totalDays = (0, helpers_1.hoursToDays)(totalHours);
        const pricePerHour = config.pricePerHour;
        // Find best matching discount tier
        let discountPercent = 0;
        for (const rule of config.discountRules) {
            if (totalDays >= rule.minDays) {
                discountPercent = rule.percentage;
            }
        }
        const basePrice = totalHours * pricePerHour;
        const discountAmount = basePrice * (discountPercent / 100);
        const finalPrice = Math.round((basePrice - discountAmount) * 100) / 100;
        return {
            totalHours: Math.round(totalHours * 100) / 100,
            totalDays: Math.round(totalDays * 100) / 100,
            pricePerHour,
            basePrice: Math.round(basePrice * 100) / 100,
            discountPercent,
            discountAmount: Math.round(discountAmount * 100) / 100,
            finalPrice,
        };
    }
    /**
     * Calculate overtime price
     */
    calculateOvertime(bookedStartTime, bookedEndTime, actualExitTime, originalPrice, pricePerHour) {
        const bookedHours = (0, helpers_1.calculateHours)(bookedStartTime, bookedEndTime);
        const actualHours = (0, helpers_1.calculateHours)(bookedStartTime, actualExitTime);
        const overtimeHours = (0, helpers_1.calculateHours)(bookedEndTime, actualExitTime);
        const overtimePrice = Math.round(overtimeHours * pricePerHour * 100) / 100;
        const newTotalPrice = Math.round((originalPrice + overtimePrice) * 100) / 100;
        return {
            bookedHours: Math.round(bookedHours * 100) / 100,
            actualHours: Math.round(actualHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            overtimePrice,
            newTotalPrice,
        };
    }
}
exports.pricingService = new PricingService();
//# sourceMappingURL=pricing.service.js.map