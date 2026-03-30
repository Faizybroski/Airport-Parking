"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Business = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BusinessSchema = new mongoose_1.default.Schema({
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
exports.Business = mongoose_1.default.model("Business", BusinessSchema);
//# sourceMappingURL=Business.js.map