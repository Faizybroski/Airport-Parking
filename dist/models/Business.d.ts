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
export declare const Business: mongoose.Model<IBusiness, {}, {}, {}, mongoose.Document<unknown, {}, IBusiness, {}, {}> & IBusiness & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Business.d.ts.map