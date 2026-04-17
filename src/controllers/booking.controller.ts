import { Request, Response, NextFunction } from "express";
import { bookingService } from "../services/booking.service";
import { pricingService } from "../services/pricing.service";
import { Business } from "../models/Business";
import { BusinessTier } from "../models/BusinessTier";
import AppError from "../utils/AppError";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const booking = await bookingService.createBooking(businessId, req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

export const getPricingConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const config = await pricingService.getConfig(businessId);
    const startingDayPrice = pricingService.calculateTotalPriceForDays(
      1,
      pricingService.getPricingSnapshot(config),
    );
    res.json({ success: true, data: startingDayPrice });
  } catch (error) {
    next(error);
  }
};

export const getBookingByTracking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const { trackingNumber } = req.params;
    if (!trackingNumber || Array.isArray(trackingNumber)) {
      return next(new AppError("Invalid tracking number", 400));
    }
    const booking = await bookingService.getByTrackingNumber(
      businessId,
      trackingNumber,
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

export const calculatePrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startTime, endTime, tierId } = req.query;
    const businessId = req.businessId!;

    if (!startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: "startTime and endTime are required",
      });
      return;
    }
    const priceCalc = await pricingService.calculatePrice(
      businessId,
      new Date(startTime as string),
      new Date(endTime as string),
      typeof tierId === "string" ? tierId : undefined,
    );
    res.json({ success: true, data: priceCalc });
  } catch (error) {
    next(error);
  }
};

/** GET /api/bookings/tiers — public list of active service tiers */
export const getActiveTiers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tiers = await BusinessTier.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, data: tiers });
  } catch (error) {
    next(error);
  }
};

/** GET /api/bookings/status — public check: is booking open? */
export const getBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const business = await Business.findById(businessId);
    if (!business) return next(new AppError("Business not found", 404));
    res.json({
      success: true,
      data: { bookingEnabled: business.bookingEnabled !== false },
    });
  } catch (error) {
    next(error);
  }
};
