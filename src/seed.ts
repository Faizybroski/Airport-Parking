import mongoose from "mongoose";
import { config } from "./config";
import { PricingConfig } from "./models/PricingConfig";
import { Business } from "./models";

const seed = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("Connected to MongoDB");

    let business = await Business.findOne({ name: "Compare" });
    if (!business) {
      business = await Business.create({
        name: "Copare",
        slug: "compare",
        bookingEnabled: true,
      });
      console.log("Business created: Compare / compare");
    } else {
      console.log("Business already exists");
    }

    // const existingConfig = await PricingConfig.findOne();
    // if (!existingConfig) {
    //   await PricingConfig.create({
    //     businessId: business._id,
    //     pricingRules: [
    //       {
    //         startDay: 1,
    //         endDay: 10,
    //         basePrice: 12,
    //         dailyIncrement: 8,
    //       },
    //       {
    //         startDay: 11,
    //         endDay: 30,
    //         basePrice: 87,
    //         dailyIncrement: 3,
    //       },
    //       {
    //         startDay: 31,
    //         endDay: null,
    //         basePrice: 146,
    //         dailyIncrement: 2,
    //       },
    //     ],
    // });
    // console.log("Pricing config created with rule-based daily pricing");
    // } else {
    //   console.log("Pricing config already exists");
    // }

    console.log("Seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();
