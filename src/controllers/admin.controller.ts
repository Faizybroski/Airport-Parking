import { Request, Response, NextFunction } from "express";
import { bookingService } from "../services/booking.service";
import { Business } from "../models/Business";
import { BookingStatus } from "../models/Booking";
import AppError from "../utils/AppError";

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const stats = await bookingService.getDashboardStats(businessId, req.bookedVia);
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
      businessId,
      status: status as BookingStatus | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      search: search as string | undefined,
      bookedVia: req.bookedVia,
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
      req.bookedVia,
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
    const businessId = req.businessId!;
    const workbook = await bookingService.exportBookingsExcel({
      businessId,
      bookedVia: req.bookedVia,
      ...req.body,
    });
    const fileName = `bookings-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(workbook);
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return next(new AppError("Invalid id", 400));
    }

    const businessId = req.businessId!;
    await bookingService.deleteBooking(businessId, id, req.bookedVia);

    res.json({
      success: true,
      data: { id },
      message: "Booking permanently deleted.",
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const result = await bookingService.bulkDeleteBookings({
      businessId,
      bookedVia: req.bookedVia,
      ...req.body,
    });

    res.json({
      success: true,
      data: result,
      message: `${result.deletedCount} booking(s) permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /admin/terminal-messages — return terminal messages map for the business */
export const getTerminalMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const business = await Business.findById(businessId);
    if (!business) return next(new AppError("Business not found", 404));
    const messages = Object.fromEntries(business.terminalMessages || new Map());
    res.json({ success: true, data: { messages } });
  } catch (error) {
    next(error);
  }
};

/** PATCH /admin/terminal-messages — update terminal messages for the business */
export const updateTerminalMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const { messages } = req.body as { messages: Record<string, string> };
    const business = await Business.findByIdAndUpdate(
      businessId,
      { terminalMessages: messages },
      { new: true },
    );
    if (!business) return next(new AppError("Business not found", 404));
    const updated = Object.fromEntries(business.terminalMessages || new Map());
    res.json({ success: true, data: { messages: updated } });
  } catch (error) {
    next(error);
  }
};

/** GET /admin/booking-toggle — return current bookingEnabled state */
export const getBookingToggle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const business = await Business.findById(businessId);
    if (!business) return next(new AppError("Business not found", 404));
    res.json({ success: true, data: { bookingEnabled: business.bookingEnabled !== false } });
  } catch (error) {
    next(error);
  }
};

/** PATCH /admin/booking-toggle — flip bookingEnabled */
export const setBookingToggle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const { bookingEnabled } = req.body;
    if (typeof bookingEnabled !== "boolean") {
      return next(new AppError("bookingEnabled must be a boolean", 400));
    }
    const business = await Business.findByIdAndUpdate(
      businessId,
      { bookingEnabled },
      { new: true },
    );
    if (!business) return next(new AppError("Business not found", 404));
    res.json({ success: true, data: { bookingEnabled: business.bookingEnabled } });
  } catch (error) {
    next(error);
  }
};
