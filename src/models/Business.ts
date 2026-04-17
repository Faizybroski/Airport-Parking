import mongoose, { Document, Types } from "mongoose";

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
  tierId?: Types.ObjectId;
  /** Per-terminal custom messages shown in confirmation emails (keyed by T1–T5). */
  terminalMessages: Map<string, string>;
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

  terminalMessages: { type: Map, of: String, default: {} },

  tierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessTier",
    default: null,
  },
});

export const Business = mongoose.model<IBusiness>("Business", BusinessSchema);
