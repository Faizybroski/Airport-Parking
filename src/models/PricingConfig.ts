import mongoose, { Schema, Document, Types, ObjectId } from "mongoose";

export interface IDiscountRule {
  minDays: number;
  percentage: number;
}

export interface IPricingRule {
  startDay: number;
  endDay?: number | null;
  basePrice: number;
  dailyIncrement: number;
}

export interface IPricingConfig extends Document {
  businessId: ObjectId;
  pricingRules?: IPricingRule[];
  firstTenDayPrices?: number[];
  day11To30Increment?: number;
  day31PlusIncrement?: number;
  // Legacy fields kept optional so older configs can still be read/migrated.
  pricePerHour?: number;
  discountRules?: IDiscountRule[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscountRuleSchema = new Schema<IDiscountRule>(
  {
    minDays: { type: Number, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

export const PricingRuleSchema = new Schema<IPricingRule>(
  {
    startDay: { type: Number, required: true, min: 1 },
    endDay: { type: Number, min: 1, default: null },
    basePrice: { type: Number, required: true, min: 0 },
    dailyIncrement: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    businessId: {
      type: Types.ObjectId,
      required: true,
    },
    pricingRules: {
      type: [PricingRuleSchema],
      default: undefined,
    },
    firstTenDayPrices: {
      type: [Number],
      required: false,
      default: undefined,
      validate: {
        validator: (value?: number[]) =>
          value === undefined ||
          (Array.isArray(value) && value.length === 10),
        message: "firstTenDayPrices must contain exactly 10 day prices",
      },
    },
    day11To30Increment: {
      type: Number,
      min: 0,
      default: undefined,
    },
    day31PlusIncrement: {
      type: Number,
      min: 0,
      default: undefined,
    },
    pricePerHour: {
      type: Number,
      min: 0,
      default: undefined,
    },
    discountRules: {
      type: [DiscountRuleSchema],
      default: undefined,
    },
  },
  { timestamps: true },
);

export const PricingConfig = mongoose.model<IPricingConfig>(
  "PricingConfig",
  PricingConfigSchema,
);
