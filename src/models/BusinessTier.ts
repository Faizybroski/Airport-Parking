import mongoose, { Schema, Document } from "mongoose";

export interface IBusinessTier extends Document {
  name: string;
  description?: string;
  features: string[];
  firstTenDayPrices: number[];
  day11To30Increment: number;
  day31PlusIncrement: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessTierSchema = new Schema<IBusinessTier>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    firstTenDayPrices: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) =>
          Array.isArray(value) && value.length === 10,
        message: "firstTenDayPrices must contain exactly 10 day prices",
      },
    },
    day11To30Increment: {
      type: Number,
      required: true,
      min: 0,
    },
    day31PlusIncrement: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const BusinessTier = mongoose.model<IBusinessTier>(
  "BusinessTier",
  BusinessTierSchema,
);
