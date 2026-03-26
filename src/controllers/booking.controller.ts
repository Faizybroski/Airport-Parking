import { Request, Response, NextFunction } from "express";
import { bookingService } from "../services/booking.service";
import { pricingService } from "../services/pricing.service";
import AppError from "../utils/AppError";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    console.log("businessId", businessId);
    const booking = await bookingService.createBooking(businessId, req.body);
    res.status(201).json({
      success: true,
      data: booking,
    });
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
      return next(new AppError("Invalid id", 400));
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
    const { startTime, endTime } = req.query;
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
    );
    res.json({ success: true, data: priceCalc });
  } catch (error) {
    next(error);
  }
};
