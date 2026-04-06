import mongoose, { Document, Types, ObjectId } from "mongoose";
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
    pricePerHour?: number;
    discountRules?: IDiscountRule[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const PricingRuleSchema: mongoose.Schema<IPricingRule, mongoose.Model<IPricingRule, any, any, any, mongoose.Document<unknown, any, IPricingRule, any, {}> & IPricingRule & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, IPricingRule, mongoose.Document<unknown, {}, mongoose.FlatRecord<IPricingRule>, {}, mongoose.DefaultSchemaOptions> & mongoose.FlatRecord<IPricingRule> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const PricingConfig: mongoose.Model<IPricingConfig, {}, {}, {}, mongoose.Document<unknown, {}, IPricingConfig, {}, {}> & IPricingConfig & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PricingConfig.d.ts.map