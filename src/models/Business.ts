import mongoose, { Schema, Document, Types } from "mongoose";

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
  totalSlots: number;
}

const BusinessSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true }, // for separate landing pages

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

  totalSlots: Number,
});

BusinessSchema.index({ status: 1 });
BusinessSchema.index({ slotNumber: 1 });
BusinessSchema.index({ currentBookingId: 1 });
export const Business = mongoose.model<IBusiness>("Business", BusinessSchema);
