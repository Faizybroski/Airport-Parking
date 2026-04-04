import mongoose, { Document, Types, ObjectId } from "mongoose";
export interface IDiscountRule {
    minDays: number;
    percentage: number;
}
export interface IPricingConfig extends Document {
    businessId: ObjectId;
    firstTenDayPrices: number[];
    pricePerHour?: number;
    discountRules?: IDiscountRule[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const PricingConfig: mongoose.Model<IPricingConfig, {}, {}, {}, mongoose.Document<unknown, {}, IPricingConfig, {}, {}> & IPricingConfig & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PricingConfig.d.ts.map