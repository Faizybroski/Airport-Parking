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
const normalizeFirstTenDayPrices = (prices) => prices
    .slice(0, exports.FIRST_TEN_DAYS_COUNT)
    .map((price) => roundToTwoDecimals(price));
const normalizePricingRule = (rule) => ({
    startDay: Math.trunc(rule.startDay),
    endDay: rule.endDay === null || rule.endDay === undefined
        ? null
        : Math.trunc(rule.endDay),
    basePrice: roundToTwoDecimals(rule.basePrice),
    dailyIncrement: roundToTwoDecimals(rule.dailyIncrement),
});
const normalizePricingRules = (rules) => rules.map(normalizePricingRule).sort((a, b) => a.startDay - b.startDay);
const validatePricingRules = (rules) => {
    if (!Array.isArray(rules) || rules.length === 0) {
        throw new errorHandler_1.AppError("At least one pricing rule is required.", 400);
    }
    let expectedStartDay = 1;
    rules.forEach((rule, index) => {
        if (!Number.isInteger(rule.startDay) || rule.startDay < 1) {
            throw new errorHandler_1.AppError("Pricing rule start days must be whole numbers.", 400);
        }
        if (rule.endDay !== null &&
            rule.endDay !== undefined &&
            (!Number.isInteger(rule.endDay) || rule.endDay < rule.startDay)) {
            throw new errorHandler_1.AppError("Pricing rule end days must be greater than or equal to start days.", 400);
        }
        if (rule.basePrice < 0 || rule.dailyIncrement < 0) {
            throw new errorHandler_1.AppError("Pricing rule amounts cannot be negative.", 400);
        }
        if (rule.startDay !== expectedStartDay) {
            throw new errorHandler_1.AppError("Pricing rules must start at day 1 and stay continuous without gaps.", 400);
        }
        const isLastRule = index === rules.length - 1;
        if (!isLastRule && (rule.endDay === null || rule.endDay === undefined)) {
            throw new errorHandler_1.AppError("Only the final pricing rule can leave the end day open-ended.", 400);
        }
        if (!isLastRule) {
            expectedStartDay = rule.endDay + 1;
        }
    });
    const lastRule = rules[rules.length - 1];
    if (lastRule.endDay !== null && lastRule.endDay !== undefined) {
        throw new errorHandler_1.AppError("The final pricing rule must be open-ended so every booking length has a price.", 400);
    }
};
const deriveLegacyFirstTenDayPrices = (config) => {
    if (Array.isArray(config.firstTenDayPrices) &&
        config.firstTenDayPrices.length === exports.FIRST_TEN_DAYS_COUNT) {
        return normalizeFirstTenDayPrices(config.firstTenDayPrices);
    }
    const legacyHourlyPrice = config.pricePerHour ?? 0;
    return Array.from({ length: exports.FIRST_TEN_DAYS_COUNT }, (_, index) => roundToTwoDecimals(legacyHourlyPrice * 24 * (index + 1)));
};
const buildLegacyPricingRules = (firstTenDayPrices, day11To30Increment = exports.DAY_11_TO_30_INCREMENT, day31PlusIncrement = exports.DAY_31_PLUS_INCREMENT) => {
    const normalizedFirstTen = normalizeFirstTenDayPrices(firstTenDayPrices);
    const dayTenPrice = normalizedFirstTen[exports.FIRST_TEN_DAYS_COUNT - 1] ?? 0;
    const day11Price = roundToTwoDecimals(dayTenPrice + day11To30Increment);
    const day31Price = roundToTwoDecimals(dayTenPrice + 20 * day11To30Increment + day31PlusIncrement);
    return [
        ...normalizedFirstTen.map((price, index) => ({
            startDay: index + 1,
            endDay: index + 1,
            basePrice: price,
            dailyIncrement: 0,
        })),
        {
            startDay: 11,
            endDay: 30,
            basePrice: day11Price,
            dailyIncrement: roundToTwoDecimals(day11To30Increment),
        },
        {
            startDay: 31,
            endDay: null,
            basePrice: day31Price,
            dailyIncrement: roundToTwoDecimals(day31PlusIncrement),
        },
    ];
};
class PricingService {
    hasPricingRules(snapshot) {
        return (Array.isArray(snapshot?.pricingRules) && snapshot.pricingRules.length > 0);
    }
    isDailySnapshot(snapshot) {
        return (Array.isArray(snapshot?.firstTenDayPrices) &&
            snapshot.firstTenDayPrices.length === exports.FIRST_TEN_DAYS_COUNT);
    }
    resolvePricingRules(snapshot) {
        const pricingRules = snapshot?.pricingRules;
        if (Array.isArray(pricingRules) && pricingRules.length > 0) {
            const rules = normalizePricingRules(pricingRules);
            validatePricingRules(rules);
            return rules;
        }
        const firstTenDayPrices = snapshot?.firstTenDayPrices;
        if (Array.isArray(firstTenDayPrices) &&
            firstTenDayPrices.length === exports.FIRST_TEN_DAYS_COUNT) {
            return buildLegacyPricingRules(firstTenDayPrices, snapshot?.day11To30Increment, snapshot?.day31PlusIncrement);
        }
        return [];
    }
    getPricingSnapshot(config) {
        const pricingRules = this.resolvePricingRules(this.hasPricingRules(config)
            ? { pricingRules: config.pricingRules }
            : {
                firstTenDayPrices: config.firstTenDayPrices?.length === exports.FIRST_TEN_DAYS_COUNT
                    ? config.firstTenDayPrices
                    : deriveLegacyFirstTenDayPrices(config),
            });
        return { pricingRules };
    }
    calculateTotalPriceForDays(totalDays, snapshot) {
        if (totalDays <= 0) {
            return 0;
        }
        const pricingRules = this.resolvePricingRules(snapshot);
        const rule = pricingRules.find((currentRule) => totalDays >= currentRule.startDay &&
            (currentRule.endDay === null ||
                currentRule.endDay === undefined ||
                totalDays <= currentRule.endDay));
        if (!rule) {
            throw new errorHandler_1.AppError(`Pricing rules do not cover bookings of ${totalDays} days.`, 500);
        }
        return roundToTwoDecimals(rule.basePrice + (totalDays - rule.startDay) * rule.dailyIncrement);
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
        config.pricingRules = this.getPricingSnapshot(config).pricingRules;
        return config;
    }
    /**
     * Update or create pricing config
     */
    async updateConfig(businessId, input) {
        const pricingRules = Array.isArray(input.pricingRules) && input.pricingRules.length > 0
            ? normalizePricingRules(input.pricingRules)
            : Array.isArray(input.firstTenDayPrices)
                ? buildLegacyPricingRules(input.firstTenDayPrices)
                : [];
        validatePricingRules(pricingRules);
        let config = await PricingConfig_1.PricingConfig.findOne({ businessId }).sort({
            createdAt: -1,
        });
        if (config) {
            config.pricingRules = pricingRules;
            config.firstTenDayPrices = undefined;
            config.pricePerHour = undefined;
            config.discountRules = undefined;
            await config.save();
        }
        else {
            config = await PricingConfig_1.PricingConfig.create({
                businessId,
                pricingRules,
            });
        }
        return config;
    }
    /**
     * Calculate price for a booking
     */
    async calculatePrice(businessId, startTime, endTime) {
        const config = await this.getConfig(businessId);
        const snapshot = this.getPricingSnapshot(config);
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