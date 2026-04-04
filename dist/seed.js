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
        console.log("Connected to MongoDB");
        let business = await models_1.Business.findOne({ name: "Park Pro" });
        if (!business) {
            business = await models_1.Business.create({
                name: "Park Pro",
                slug: "park-pro",
                bookingEnabled: true,
            });
            console.log("Business created: Park Pro / park-pro");
        }
        else {
            console.log("Business already exists");
        }
        const existingConfig = await PricingConfig_1.PricingConfig.findOne();
        if (!existingConfig) {
            await PricingConfig_1.PricingConfig.create({
                businessId: business._id,
                firstTenDayPrices: [12, 20, 28, 36, 44, 52, 60, 68, 76, 84],
            });
            console.log("Pricing config created with the first 10 daily prices");
        }
        else {
            console.log("Pricing config already exists");
        }
        console.log("Seed completed successfully");
        process.exit(0);
    }
    catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    }
};
seed();
//# sourceMappingURL=seed.js.map