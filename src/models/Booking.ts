import mongoose, { Schema, Document, Types } from "mongoose";
import {
  BOOKING_STATUS_VALUES,
  getBookingLifecycleState,
  getBookingStatusLabel,
} from "../utils/bookingLifecycle";
import { IPricingRule, PricingRuleSchema } from "./PricingConfig";
import type { BookingStatus } from "../utils/bookingLifecycle";

export type { BookingStatus } from "../utils/bookingLifecycle";

export type PaymentStatus = "awaiting_payment" | "paid";

export interface IBooking extends Document {
  businessId: Types.ObjectId;
  userName: string;
  userEmail: string;
  userPhone: string;
  carMake: string;
  carModel: string;
  carNumber: string;
  carColor: string;
  trackingNumber: string;
  bookedStartTime: Date;
  bookedEndTime: Date;
  actualExitTime?: Date | null;
  departureTerminal?: string;
  departureFlightNo?: string;
  arrivalTerminal?: string;
  arrivalFlightNo?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  price: number;
  bookedDays: number;
  overtimeDays: number;
  overtimePrice: number;
  totalPrice: number;
  pricingRulesSnapshot: IPricingRule[];
  firstTenDayPricesSnapshot: number[];
  day11To30Increment: number;
  day31PlusIncrement: number;
  // Legacy fields kept optional for older bookings created before the
  // day-based tariff migration.
  overtimeHours?: number;
  pricePerHour?: number;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
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
      enum: BOOKING_STATUS_VALUES,
      default: "upcoming",
    },
    paymentStatus: {
      type: String,
      enum: ["awaiting_payment", "paid"],
      default: "paid",
    },
    stripeSessionId: { type: String, default: null },
    price: { type: Number, required: true },
    bookedDays: { type: Number, required: true, min: 1, default: 1 },
    overtimeDays: { type: Number, default: 0 },
    overtimePrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    pricingRulesSnapshot: {
      type: [PricingRuleSchema],
      default: [],
    },
    firstTenDayPricesSnapshot: {
      type: [Number],
      default: [],
    },
    day11To30Increment: { type: Number, default: 3 },
    day31PlusIncrement: { type: Number, default: 2 },
    overtimeHours: { type: Number, default: 0 },
    pricePerHour: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

BookingSchema.virtual("statusLabel").get(function (this: IBooking) {
  return getBookingStatusLabel(this.status);
});

BookingSchema.virtual("canActivate").get(function (this: IBooking) {
  return getBookingLifecycleState(this).canActivate;
});

BookingSchema.virtual("canComplete").get(function (this: IBooking) {
  return getBookingLifecycleState(this).canComplete;
});

BookingSchema.virtual("canCancel").get(function (this: IBooking) {
  return getBookingLifecycleState(this).canCancel;
});

BookingSchema.virtual("isOvertimeRunning").get(function (this: IBooking) {
  return getBookingLifecycleState(this).isOvertimeRunning;
});

BookingSchema.virtual("timeUntilStartHours").get(function (this: IBooking) {
  return getBookingLifecycleState(this).timeUntilStartHours;
});

BookingSchema.virtual("timeRemainingHours").get(function (this: IBooking) {
  return getBookingLifecycleState(this).timeRemainingHours;
});

BookingSchema.virtual("uptimeDays").get(function (this: IBooking) {
  return getBookingLifecycleState(this).uptimeDays;
});

BookingSchema.virtual("uptimePrice").get(function (this: IBooking) {
  return getBookingLifecycleState(this).uptimePrice;
});

BookingSchema.virtual("currentTotalPrice").get(function (this: IBooking) {
  return getBookingLifecycleState(this).currentTotalPrice;
});

BookingSchema.virtual("lateChargeMode").get(function (this: IBooking) {
  return getBookingLifecycleState(this).lateChargeMode;
});

BookingSchema.index({ stripeSessionId: 1 });
BookingSchema.index({ trackingNumber: 1 });
BookingSchema.index({ carNumber: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ bookedStartTime: 1 });
BookingSchema.index({ bookedEndTime: 1 });
BookingSchema.index({ userEmail: 1 });
BookingSchema.index({ createdAt: -1 });

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
