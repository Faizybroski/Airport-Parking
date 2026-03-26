import { Request, Response, NextFunction } from "express";
import { slotService } from "../services/slot.service";
import AppError from "../utils/AppError";

export const getAllSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.query;
    const businessId = (req as any).businessId;
    const slots = await slotService.getAllSlots(
      businessId,
      status as string | undefined,
    );
    const stats = await slotService.getSlotStats(businessId);
    res.json({ success: true, data: { slots, stats } });
  } catch (error) {
    next(error);
  }
};

export const updateSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return next(new AppError("Invalid id", 400));
    }

    const { status } = req.body;
    const businessId = (req as any).businessId;
    const slot = await slotService.updateSlotStatus(businessId, id, status);
    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};
