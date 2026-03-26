import { Request, Response, NextFunction } from "express";
import { bookingService } from "../services/booking.service";
import { BookingStatus } from "../models/Booking";
import AppError from "../utils/AppError";

export const getDashboard = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = _req.businessId!;

    const stats = await bookingService.getDashboardStats(businessId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, page, limit, search } = req.query;
    const businessId = req.businessId!;

    const result = await bookingService.getAllBookings({
      businessId: businessId,
      status: status as BookingStatus | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      search: search as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return next(new AppError("Invalid id", 400));
    }

    const { status, actualExitTime } = req.body;
    const businessId = req.businessId!;
    const booking = await bookingService.updateStatus(
      businessId,
      id,
      status,
      actualExitTime,
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

export const exportBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.query;
    const businessId = req.businessId!;

    const csv = await bookingService.exportBookingsCSV(
      businessId,
      status as BookingStatus | undefined,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
