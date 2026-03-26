import mongoose, { Schema, Document, Types } from "mongoose";

export type SlotStatus = "available" | "occupied";

export interface ISlot extends Document {
  slotNumber: number;
  businessId: Types.ObjectId;
  status: SlotStatus;
  currentBookingId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema<ISlot>(
  {
    slotNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "occupied"],
      default: "available",
    },
    currentBookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  { timestamps: true },
);

SlotSchema.index({ businessId: 1 });
SlotSchema.index({ status: 1 });
SlotSchema.index({ slotNumber: 1 });
SlotSchema.index({ currentBookingId: 1 });
export const Slot = mongoose.model<ISlot>("Slot", SlotSchema);
