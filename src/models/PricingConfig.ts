import mongoose, { Schema, Document, Types, ObjectId } from "mongoose";

export interface IDiscountRule {
  minDays: number;
  percentage: number;
}

export interface IPricingConfig extends Document {
  businessId: ObjectId;
  pricePerHour: number;
  discountRules: IDiscountRule[];
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
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    discountRules: {
      type: [DiscountRuleSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export const PricingConfig = mongoose.model<IPricingConfig>(
  "PricingConfig",
  PricingConfigSchema,
);
