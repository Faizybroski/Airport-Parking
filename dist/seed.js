"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const PricingConfig_1 = require("./models/PricingConfig");
const models_1 = require("./models");
const seed = async () => {
    try {
        await mongoose_1.default.connect(config_1.config.mongodbUri);
        console.log("✅ Connected to MongoDB");
        // Seed Business
        const existingBusiness = await models_1.Business.findOne({ name: "Park Pro" });
        if (!existingBusiness) {
            await models_1.Business.create({
                name: "Park Pro",
                slug: "park-pro",
                bookingEnabled: true,
            });
            console.log("✅ Business created: Park Pro / park-pro");
        }
        else {
            console.log("ℹ️  Business already exists");
        }
        // Seed Pricing Config
        const existingConfig = await PricingConfig_1.PricingConfig.findOne();
        if (!existingConfig) {
            await PricingConfig_1.PricingConfig.create({
                businessId: existingBusiness?._id,
                pricePerHour: 3,
                discountRules: [
                    { minDays: 5, percentage: 10 },
                    { minDays: 10, percentage: 20 },
                    { minDays: 15, percentage: 30 },
                ],
            });
            console.log("✅ Pricing config created: £3/hr with discount tiers");
        }
        else {
            console.log("ℹ️  Pricing config already exists");
        }
        console.log("\n🎉 Seed completed successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
};
seed();
//# sourceMappingURL=seed.js.map