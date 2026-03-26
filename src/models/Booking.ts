import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus = "upcoming" | "active" | "completed" | "cancelled";

export interface IBooking extends Document {
  // Business info
  businessId: Types.ObjectId;
  // User info
  userName: string;
  userEmail: string;
  userPhone: string;
  // Car info
  carMake: string;
  carModel: string;
  carNumber: string;
  carColor: string;
  // Slot
  slotId: Types.ObjectId;
  slotNumber: number;
  // Tracking
  trackingNumber: string;
  // Dates
  bookedStartTime: Date;
  bookedEndTime: Date;
  actualExitTime?: Date;
  // Flight info (optional)
  departureTerminal?: string;
  departureFlightNo?: string;
  arrivalTerminal?: string;
  arrivalFlightNo?: string;
  // Status & pricing
  status: BookingStatus;
  price: number;
  overtimeHours: number;
  overtimePrice: number;
  totalPrice: number;
  pricePerHour: number;
  discountPercent: number;
  // Timestamps
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
    slotId: { type: Schema.Types.ObjectId, ref: "Slot", required: true },
    slotNumber: { type: Number, required: true },
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
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
    },
    price: { type: Number, required: true },
    overtimeHours: { type: Number, default: 0 },
    overtimePrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    pricePerHour: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Indexes for performance
BookingSchema.index({ trackingNumber: 1 });
BookingSchema.index({ slotId: 1 });
BookingSchema.index({ slotNumber: 1 });
BookingSchema.index({ carNumber: 1 });
BookingSchema.index({ carMake: 1 });
BookingSchema.index({ carModel: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ bookedStartTime: 1 });
BookingSchema.index({ bookedEndTime: 1 });
BookingSchema.index({ userEmail: 1 });
BookingSchema.index({ createdAt: -1 });

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
