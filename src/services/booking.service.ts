import { Booking, IBooking, BookingStatus } from "../models/Booking";
import { slotService } from "./slot.service";
import { pricingService } from "./pricing.service";
import { emailService } from "./email.service";
import { generateTrackingNumber, calculateHours } from "../utils/helpers";
import { AppError } from "../middleware/errorHandler";
import { CreateBookingInput } from "../validators";
import { ObjectId, Types } from "mongoose";

class BookingService {
  /**
   * Create a new booking
   */
  async createBooking(
    businessId: string,
    data: CreateBookingInput,
  ): Promise<IBooking> {
    const startTime = new Date(data.bookedStartTime);
    const endTime = new Date(data.bookedEndTime);

    // Calculate price
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

    // Create booking first (without slot, to get the ID)
    const booking = new Booking({
      businessId: businessId,
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
      price: priceCalc.finalPrice,
      totalPrice: priceCalc.finalPrice,
      pricePerHour: priceCalc.pricePerHour,
      discountPercent: priceCalc.discountPercent,
      overtimeHours: 0,
      overtimePrice: 0,
      // Temporary slot values, will be updated
      slotId: new Types.ObjectId(),
      slotNumber: 0,
    });

    // Assign a slot
    const slot = await slotService.assignSlot(booking._id as Types.ObjectId);
    booking.slotId = slot._id as Types.ObjectId;
    booking.slotNumber = slot.slotNumber;

    await booking.save();

    // Send confirmation email (non-blocking)
    emailService.sendBookingConfirmation(booking).catch(console.error);

    return booking;
  }

  /**
   * Get booking by tracking number (public)
   */
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

  /**
   * Get all bookings with filters and pagination (admin)
   */
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

  /**
   * Update booking status (admin)
   */
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
    const previousStatus = booking.status;
    booking.status = status;

    // Handle status transitions
    if (status === "completed" || status === "cancelled") {
      // Release the slot
      await slotService.releaseSlot(businessId, booking.slotId);

      // If completed, calculate overtime
      if (status === "completed") {
        const exitTime = actualExitTime ? new Date(actualExitTime) : new Date();
        booking.actualExitTime = exitTime;

        const overtime = await pricingService.calculateOvertime(
          businessId,
          booking.bookedStartTime,
          booking.bookedEndTime,
          exitTime,
          booking.price,
        );

        booking.overtimeHours = overtime.overtimeHours;
        booking.overtimePrice = overtime.overtimePrice;
        booking.totalPrice = overtime.newTotalPrice;
      }
    }

    await booking.save();
    return booking;
  }

  /**
   * Get dashboard stats (admin)
   */
  async getDashboardStats(businessId: string): Promise<{
    businessId: string;
    totalBookings: number;
    activeBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    todayBookings: number;
    slots: { total: number; available: number; occupied: number };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalBookings,
      activeBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      revenueResult,
      todayBookings,
      slots,
    ] = await Promise.all([
      Booking.countDocuments({ businessId }),
      Booking.countDocuments({ status: "active", businessId }),
      Booking.countDocuments({ status: "upcoming", businessId }),
      Booking.countDocuments({ status: "completed", businessId }),
      Booking.countDocuments({ status: "cancelled", businessId }),
      Booking.aggregate([
        { $match: { businessId, status: { $in: ["completed", "active"] } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Booking.countDocuments({
        businessId,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      slotService.getSlotStats(businessId),
    ]);

    return {
      businessId,
      totalBookings,
      activeBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue: revenueResult[0]?.total || 0,
      todayBookings,
      slots,
    };
  }

  /**
   * Export bookings as CSV data
   */
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
      "Slot",
      "Start Date",
      "End Date",
      "Status",
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
      b.slotNumber,
      new Date(b.bookedStartTime).toISOString(),
      new Date(b.bookedEndTime).toISOString(),
      b.status,
      b.price.toFixed(2),
      b.overtimeHours.toFixed(1),
      b.totalPrice.toFixed(2),
      new Date(b.createdAt).toISOString(),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

export const bookingService = new BookingService();
