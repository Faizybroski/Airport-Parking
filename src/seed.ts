import mongoose from "mongoose";
import { config } from "./config";
import { PricingConfig } from "./models/PricingConfig";
import { Business } from "./models";

const seed = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("Connected to MongoDB");

    let business = await Business.findOne({ name: "Park Pro" });
    if (!business) {
      business = await Business.create({
        name: "Park Pro",
        slug: "park-pro",
        bookingEnabled: true,
      });
      console.log("Business created: Park Pro / park-pro");
    } else {
      console.log("Business already exists");
    }

    const existingConfig = await PricingConfig.findOne();
    if (!existingConfig) {
      await PricingConfig.create({
        businessId: business._id,
        firstTenDayPrices: [12, 20, 28, 36, 44, 52, 60, 68, 76, 84],
      });
      console.log("Pricing config created with the first 10 daily prices");
    } else {
      console.log("Pricing config already exists");
    }

    console.log("Seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();
