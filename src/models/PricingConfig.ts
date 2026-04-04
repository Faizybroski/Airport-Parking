import mongoose, { Schema, Document, Types, ObjectId } from "mongoose";

export interface IDiscountRule {
  minDays: number;
  percentage: number;
}

export interface IPricingConfig extends Document {
  businessId: ObjectId;
  firstTenDayPrices: number[];
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

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    businessId: {
      type: Types.ObjectId,
      required: true,
    },
    firstTenDayPrices: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) => Array.isArray(value) && value.length === 10,
        message: "firstTenDayPrices must contain exactly 10 day prices",
      },
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
