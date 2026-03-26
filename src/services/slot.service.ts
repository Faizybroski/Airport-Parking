import { Slot, ISlot } from "../models/Slot";
import { AppError } from "../middleware/errorHandler";
import { Types } from "mongoose";

class SlotService {
  /**
   * Find first available slot and assign it
   */
  async assignSlot(bookingId: Types.ObjectId): Promise<ISlot> {
    const slot = await Slot.findOneAndUpdate(
      { status: "available" },
      { status: "occupied", currentBookingId: bookingId },
      { new: true, sort: { slotNumber: 1 } },
    );

    if (!slot) {
      throw new AppError(
        "No parking slots available. Please try again later.",
        409,
      );
    }

    return slot;
  }

  /**
   * Release a slot (mark as available)
   */
  async releaseSlot(
    businessId: string,
    slotId: Types.ObjectId,
  ): Promise<ISlot | null> {
    return await Slot.findOneAndUpdate(
      { businessId, _id: slotId },
      { status: "available", currentBookingId: null },
      { new: true },
    );
  }

  /**
   * Get all slots with optional status filter
   */
  async getAllSlots(businessId: string, status?: string): Promise<ISlot[]> {
    const query: any = { businessId };
    if (status) query.status = status;
    return await Slot.find(query)
      .sort({ slotNumber: 1 })
      .populate("currentBookingId");
  }

  /**
   * Get slot stats
   */
  async getSlotStats(
    businessId: string,
  ): Promise<{ total: number; available: number; occupied: number }> {
    const total = await Slot.countDocuments({ businessId });
    const available = await Slot.countDocuments({
      status: "available",
      businessId,
    });
    const occupied = await Slot.countDocuments({
      status: "occupied",
      businessId,
    });
    return { total, available, occupied };
  }

  /**
   * Update a slot status manually
   */
  async updateSlotStatus(
    businessId: string,
    slotId: string,
    status: "available" | "occupied",
  ): Promise<ISlot> {
    const slot = await Slot.findOneAndUpdate(
      { businessId, _id: slotId },
      { status, currentBookingId: null },
      { new: true },
    );
    if (!slot) {
      throw new AppError("Slot not found", 404);
    }

    slot.status = status;
    if (status === "available") {
      slot.currentBookingId = null;
    }
    await slot.save();
    return slot;
  }
}

export const slotService = new SlotService();
