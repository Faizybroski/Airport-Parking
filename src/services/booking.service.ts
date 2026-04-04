import mongoose from "mongoose";
import { Booking, IBooking, BookingStatus } from "../models/Booking";
import { Business } from "../models/Business";
import { pricingService } from "./pricing.service";
import { emailService } from "./email.service";
import { generateTrackingNumber } from "../utils/helpers";
import { AppError } from "../middleware/errorHandler";
import { CreateBookingInput } from "../validators";
import { getBookingStatusTransitionError } from "../utils/bookingLifecycle";

class BookingService {
  async createBooking(
    businessId: string,
    data: CreateBookingInput,
  ): Promise<IBooking> {
    // Check if booking is enabled for this business
    const business = await Business.findById(businessId);
    if (!business) {
      throw new AppError("Business not found", 404);
    }
    if (business.bookingEnabled === false) {
      throw new AppError(
        "Bookings are currently disabled. Please try again later.",
        403,
      );
    }

    const startTime = new Date(data.bookedStartTime);
    const endTime = new Date(data.bookedEndTime);

    const priceCalc = await pricingService.calculatePrice(
      businessId,
      startTime,
      endTime,
    );

    // Generate unique tracking number
    let trackingNumber: string;
    let exists = true;
    do {
      trackingNumber = generateTrackingNumber();
      exists = !!(await Booking.findOne({ trackingNumber }));
    } while (exists);

    const booking = new Booking({
      businessId,
      userName: data.userName,
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      carMake: data.carMake,
      carModel: data.carModel,
      carNumber: data.carNumber.toUpperCase(),
      carColor: data.carColor,
      bookedStartTime: startTime,
      bookedEndTime: endTime,
      departureTerminal: data.departureTerminal || "",
      departureFlightNo: data.departureFlightNo || "",
      arrivalTerminal: data.arrivalTerminal || "",
      arrivalFlightNo: data.arrivalFlightNo || "",
      trackingNumber,
      status: "upcoming",
      paymentStatus: "awaiting_payment",
      price: priceCalc.finalPrice,
      totalPrice: priceCalc.finalPrice,
      pricePerHour: priceCalc.pricePerHour,
      discountPercent: priceCalc.discountPercent,
      overtimeHours: 0,
      overtimePrice: 0,
    });

    await booking.save();
    return booking;
  }

  async attachStripeSession(bookingId: string, sessionId: string): Promise<void> {
    await Booking.findByIdAndUpdate(bookingId, { stripeSessionId: sessionId });
  }

  async confirmPayment(sessionId: string): Promise<IBooking | null> {
    const booking = await Booking.findOneAndUpdate(
      { stripeSessionId: sessionId, paymentStatus: 'awaiting_payment' },
      { paymentStatus: 'paid' },
      { new: true },
    );
    if (booking) {
      emailService.sendBookingConfirmation(booking).catch(console.error);
    }
    return booking;
  }

  async cancelPendingBooking(sessionId: string): Promise<void> {
    await Booking.findOneAndUpdate(
      { stripeSessionId: sessionId, paymentStatus: 'awaiting_payment' },
      { status: 'cancelled' },
    );
  }

  async getBySessionId(sessionId: string): Promise<IBooking | null> {
    return Booking.findOne({ stripeSessionId: sessionId });
  }

  async getByTrackingNumber(
    businessId: string,
    trackingNumber: string,
  ): Promise<IBooking> {
    const booking = await Booking.findOne({
      businessId,
      trackingNumber: trackingNumber.toUpperCase(),
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    return booking;
  }

  async getAllBookings(params: {
    businessId: string;
    status?: BookingStatus;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    bookings: IBooking[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { businessId, status, page = 1, limit = 20, search } = params;
    const query: any = {};

    if (businessId) query.businessId = businessId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { carNumber: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Booking.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { bookings, total, page, totalPages };
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: BookingStatus,
    actualExitTime?: string,
  ): Promise<IBooking> {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }
    if (booking.businessId.toString() !== businessId) {
      throw new AppError("You are not authorized to update this booking", 403);
    }

    const transitionError = getBookingStatusTransitionError(
      booking.status,
      status,
      booking.bookedStartTime,
    );

    if (transitionError) {
      throw new AppError(transitionError, 400);
    }

    if (status !== "cancelled" && booking.paymentStatus !== "paid") {
      throw new AppError(
        "Booking cannot be activated or completed until payment is confirmed.",
        400,
      );
    }

    if (status === "completed") {
      const exitTime = actualExitTime ? new Date(actualExitTime) : new Date();
      if (Number.isNaN(exitTime.getTime())) {
        throw new AppError("Actual exit time is invalid", 400);
      }
      if (exitTime < booking.bookedStartTime) {
        throw new AppError(
          "Actual exit time cannot be before the booked start time",
          400,
        );
      }

      booking.status = status;
      booking.actualExitTime = exitTime;

      const overtime = pricingService.calculateOvertime(
        booking.bookedStartTime,
        booking.bookedEndTime,
        exitTime,
        booking.price,
        booking.pricePerHour,
      );

      booking.overtimeHours = overtime.overtimeHours;
      booking.overtimePrice = overtime.overtimePrice;
      booking.totalPrice = overtime.newTotalPrice;
    } else {
      booking.status = status;
      booking.actualExitTime = null;
      booking.overtimeHours = 0;
      booking.overtimePrice = 0;
      booking.totalPrice = booking.price;
    }

    await booking.save();
    return booking;
  }

  async getDashboardStats(businessId: string): Promise<{
    businessId: string;
    totalBookings: number;
    activeBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    overtimeRevenue: number;
    stripeRevenue: number;
    baseRevenue: number;
    todayBookings: number;
    bookingEnabled: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const business = await Business.findById(businessId);
    const objectBusinessId = new mongoose.Types.ObjectId(businessId);

    const [
      totalBookings,
      activeBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      stripeRevenueResult,
      overtimeResult,
      todayBookings,
    ] = await Promise.all([
      Booking.countDocuments({ businessId }),
      Booking.countDocuments({ status: "active", businessId }),
      Booking.countDocuments({ status: "upcoming", businessId }),
      Booking.countDocuments({ status: "completed", businessId }),
      Booking.countDocuments({ status: "cancelled", businessId }),
      // Base online revenue: sum of the prepaid booking amount for paid,
      // non-cancelled bookings.
      Booking.aggregate([
        {
          $match: {
            businessId: objectBusinessId,
            paymentStatus: "paid",
            status: { $in: ["upcoming", "active", "completed"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
      // Extra pickup revenue is finalized once the booking is completed.
      Booking.aggregate([
        {
          $match: {
            businessId: objectBusinessId,
            paymentStatus: "paid",
            status: "completed",
            overtimePrice: { $gt: 0 },
          },
        },
        { $group: { _id: null, total: { $sum: "$overtimePrice" } } },
      ]),
      Booking.countDocuments({
        businessId,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
    ]);

    const stripeRevenue: number = stripeRevenueResult[0]?.total || 0;
    const overtimeRevenue: number = overtimeResult[0]?.total || 0;
    const totalRevenue: number = stripeRevenue + overtimeRevenue;

    return {
      businessId,
      totalBookings,
      activeBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      overtimeRevenue,
      stripeRevenue,
      baseRevenue: stripeRevenue,
      todayBookings,
      bookingEnabled: business?.bookingEnabled !== false,
    };
  }

  async exportBookingsCSV(
    businessId: string,
    status?: BookingStatus,
  ): Promise<string> {
    const query: any = {};
    if (businessId) query.businessId = businessId;
    if (status) query.status = status;

    const bookings = await Booking.find(query).sort({ createdAt: -1 });

    const headers = [
      "Tracking Number",
      "Name",
      "Email",
      "Phone",
      "Car Make",
      "Car Model",
      "Car Number",
      "Car Color",
      "Start Date",
      "End Date",
      "Actual Exit Time",
      "Status",
      "Payment Status",
      "Price (£)",
      "Overtime Hours",
      "Total Price (£)",
      "Created At",
    ];

    const rows = bookings.map((b) => [
      b.trackingNumber,
      b.userName,
      b.userEmail,
      b.userPhone,
      b.carMake,
      b.carModel,
      b.carNumber,
      b.carColor,
      new Date(b.bookedStartTime).toISOString(),
      new Date(b.bookedEndTime).toISOString(),
      b.actualExitTime ? new Date(b.actualExitTime).toISOString() : "",
      b.status,
      b.paymentStatus,
      b.price.toFixed(2),
      b.overtimeHours.toFixed(1),
      b.totalPrice.toFixed(2),
      new Date(b.createdAt).toISOString(),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

export const bookingService = new BookingService();
