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
exports.Booking = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bookingLifecycle_1 = require("../utils/bookingLifecycle");
const BookingSchema = new mongoose_1.Schema({
    businessId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
    },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userPhone: { type: String, required: true, trim: true },
    carMake: { type: String, required: true, trim: true },
    carModel: { type: String, required: true, trim: true },
    carNumber: { type: String, required: true, trim: true, uppercase: true },
    carColor: { type: String, required: true, trim: true },
    trackingNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
    },
    bookedStartTime: { type: Date, required: true },
    bookedEndTime: { type: Date, required: true },
    actualExitTime: { type: Date, default: null },
    departureTerminal: { type: String, default: "" },
    departureFlightNo: { type: String, default: "" },
    arrivalTerminal: { type: String, default: "" },
    arrivalFlightNo: { type: String, default: "" },
    status: {
        type: String,
        enum: bookingLifecycle_1.BOOKING_STATUS_VALUES,
        default: "upcoming",
    },
    paymentStatus: {
        type: String,
        enum: ['awaiting_payment', 'paid'],
        default: 'paid',
    },
    stripeSessionId: { type: String, default: null },
    price: { type: Number, required: true },
    overtimeHours: { type: Number, default: 0 },
    overtimePrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    pricePerHour: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
BookingSchema.virtual("statusLabel").get(function () {
    return (0, bookingLifecycle_1.getBookingStatusLabel)(this.status);
});
BookingSchema.virtual("canActivate").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).canActivate;
});
BookingSchema.virtual("canComplete").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).canComplete;
});
BookingSchema.virtual("canCancel").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).canCancel;
});
BookingSchema.virtual("isOvertimeRunning").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).isOvertimeRunning;
});
BookingSchema.virtual("timeUntilStartHours").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).timeUntilStartHours;
});
BookingSchema.virtual("timeRemainingHours").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).timeRemainingHours;
});
BookingSchema.virtual("uptimeHours").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).uptimeHours;
});
BookingSchema.virtual("uptimePrice").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).uptimePrice;
});
BookingSchema.virtual("currentTotalPrice").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).currentTotalPrice;
});
BookingSchema.virtual("lateChargeMode").get(function () {
    return (0, bookingLifecycle_1.getBookingLifecycleState)(this).lateChargeMode;
});
BookingSchema.index({ stripeSessionId: 1 });
BookingSchema.index({ trackingNumber: 1 });
BookingSchema.index({ carNumber: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ bookedStartTime: 1 });
BookingSchema.index({ bookedEndTime: 1 });
BookingSchema.index({ userEmail: 1 });
BookingSchema.index({ createdAt: -1 });
exports.Booking = mongoose_1.default.model("Booking", BookingSchema);
//# sourceMappingURL=Booking.js.map