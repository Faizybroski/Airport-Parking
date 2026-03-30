import mongoose from "mongoose";
import { config } from "./config";
import { PricingConfig } from "./models/PricingConfig";
import { Business } from "./models";

const seed = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB");

    // Seed Business
    const existingBusiness = await Business.findOne({ name: "Park Pro" });
    if (!existingBusiness) {
      await Business.create({
        name: "Park Pro",
        slug: "park-pro",
        bookingEnabled: true,
      });
      console.log("✅ Business created: Park Pro / park-pro");
    } else {
      console.log("ℹ️  Business already exists");
    }

    // Seed Pricing Config
    const existingConfig = await PricingConfig.findOne();
    if (!existingConfig) {
      await PricingConfig.create({
        businessId: existingBusiness?._id,
        pricePerHour: 3,
        discountRules: [
          { minDays: 5, percentage: 10 },
          { minDays: 10, percentage: 20 },
          { minDays: 15, percentage: 30 },
        ],
      });
      console.log("✅ Pricing config created: £3/hr with discount tiers");
    } else {
      console.log("ℹ️  Pricing config already exists");
    }

    console.log("\n🎉 Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
};

seed();
