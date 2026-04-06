"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingConfig = exports.PricingRuleSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DiscountRuleSchema = new mongoose_1.Schema({
    minDays: { type: Number, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });
exports.PricingRuleSchema = new mongoose_1.Schema({
    startDay: { type: Number, required: true, min: 1 },
    endDay: { type: Number, min: 1, default: null },
    basePrice: { type: Number, required: true, min: 0 },
    dailyIncrement: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });
const PricingConfigSchema = new mongoose_1.Schema({
    businessId: {
        type: mongoose_1.Types.ObjectId,
        required: true,
    },
    pricingRules: {
        type: [exports.PricingRuleSchema],
        default: undefined,
    },
    firstTenDayPrices: {
        type: [Number],
        required: false,
        default: undefined,
        validate: {
            validator: (value) => value === undefined ||
                (Array.isArray(value) && value.length === 10),
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
}, { timestamps: true });
exports.PricingConfig = mongoose_1.default.model("PricingConfig", PricingConfigSchema);
//# sourceMappingURL=PricingConfig.js.map