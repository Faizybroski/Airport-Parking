import mongoose, { Document } from "mongoose";

export interface IBusiness extends Document {
  name: string;
  slug: string;
  branding: {
    logo: string;
    primaryColor: string;
  };
  pricing: {
    pricePerHour: number;
    discountRules: {
      minDays: number;
      discountPercent: number;
    }[];
  };
  bookingEnabled: boolean;
}

const BusinessSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },

  branding: {
    logo: String,
    primaryColor: String,
  },

  pricing: {
    pricePerHour: Number,
    discountRules: [
      {
        minDays: Number,
        discountPercent: Number,
      },
    ],
  },

  bookingEnabled: { type: Boolean, default: true },
});

export const Business = mongoose.model<IBusiness>("Business", BusinessSchema);
