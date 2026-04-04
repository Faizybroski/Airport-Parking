"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePricingConfig = exports.getPricingConfig = void 0;
const pricing_service_1 = require("../services/pricing.service");
const getPricingConfig = async (_req, res, next) => {
    try {
        const businessId = _req.businessId;
        const config = await pricing_service_1.pricingService.getConfig(businessId);
        res.json({ success: true, data: config });
    }
    catch (error) {
        next(error);
    }
};
exports.getPricingConfig = getPricingConfig;
const updatePricingConfig = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const { firstTenDayPrices } = req.body;
        const config = await pricing_service_1.pricingService.updateConfig(businessId, firstTenDayPrices);
        res.json({ success: true, data: config });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePricingConfig = updatePricingConfig;
//# sourceMappingURL=pricing.controller.js.map