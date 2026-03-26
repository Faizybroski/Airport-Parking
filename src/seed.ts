import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "./config";
import { Admin } from "./models/Admin";
import { Slot } from "./models/Slot";
import { PricingConfig } from "./models/PricingConfig";
import { Business } from "./models";

const seed = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB");

    // Seed Admin
    // const existingAdmin = await Admin.findOne({ email: "admin@parkpro.com" });
    // if (!existingAdmin) {
    //   const hashedPassword = await bcrypt.hash("123123123", 12);
    //   await Admin.create({
    //     email: "admin@parkpro.com",
    //     password: hashedPassword,
    //     name: "ParkPro Admin",
    //   });
    //   console.log("✅ Admin created: admin@parkpro.com / 123123123");
    // } else {
    //   console.log("ℹ️  Admin already exists");
    // }

    // Seed Business
    const existingBusiness = await Business.findOne({
      name: "Park Pro",
    });
    if (!existingBusiness) {
      await Business.create({
        name: "Park Pro",
        slug: "park-pro",
      });
      console.log("✅ Business created: Park Pro / park-pro");
    } else {
      console.log("ℹ️  Business already exists");
    }

    // Seed Slots (50 slots)
    const slotCount = await Slot.countDocuments();
    if (slotCount === 0) {
      const slots = Array.from({ length: 50 }, (_, i) => ({
        slotNumber: i + 1,
        status: "available" as const,
        currentBookingId: null,
        businessId: existingBusiness?._id,
      }));
      await Slot.insertMany(slots);
      console.log("✅ 50 parking slots created");
    } else {
      console.log(`ℹ️  ${slotCount} slots already exist`);
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
