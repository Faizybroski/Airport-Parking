import mongoose from "mongoose";
import { Booking, IBooking, BookingStatus } from "../models/Booking";
import { Business } from "../models/Business";
import { pricingService } from "./pricing.service";
import { emailService } from "./email.service";
import { formatDayCount, generateTrackingNumber } from "../utils/helpers";
import { buildXlsxWorkbook, XlsxSheetData } from "../utils/xlsx";
import { AppError } from "../middleware/errorHandler";
import { BookingBulkSelectionInput, CreateBookingInput } from "../validators";
import { getBookingStatusTransitionError } from "../utils/bookingLifecycle";

type BookingListParams = {
  businessId: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
  search?: string;
};

type BookingSelectionScope = BookingBulkSelectionInput & {
  businessId: string;
};

const MAX_BOOKINGS_PAGE_SIZE = 100;

const formatTimestampForExport = (value?: Date | null): string => {
  if (!value) {
    return "";
  }

  return value.toISOString().replace("T", " ").slice(0, 16) + " UTC";
};

class BookingService {
  async createBooking(
    businessId: string,
    data: CreateBookingInput,
  ): Promise<IBooking> {
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
      bookedDays: priceCalc.totalDays,
      pricingRulesSnapshot: priceCalc.pricingRules,
      firstTenDayPricesSnapshot: [],
      day11To30Increment: 0,
      day31PlusIncrement: 0,
      pricePerHour: 0,
      discountPercent: 0,
      overtimeDays: 0,
      overtimeHours: 0,
      overtimePrice: 0,
      bookedVia: data.bookedVia || "",
    });

    await booking.save();
    return booking;
  }

  async attachStripeSession(bookingId: string, sessionId: string): Promise<void> {
    await Booking.findByIdAndUpdate(bookingId, { stripeSessionId: sessionId });
  }

  async confirmPayment(sessionId: string): Promise<IBooking | null> {
    const booking = await Booking.findOneAndUpdate(
      { stripeSessionId: sessionId, paymentStatus: "awaiting_payment" },
      { paymentStatus: "paid" },
      { new: true },
    );

    if (booking) {
      emailService.sendBookingConfirmation(booking).catch(console.error);
    }

    return booking;
  }

  async cancelPendingBooking(sessionId: string): Promise<void> {
    await Booking.findOneAndUpdate(
      { stripeSessionId: sessionId, paymentStatus: "awaiting_payment" },
      { status: "cancelled" },
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

  private buildBookingsQuery({
    businessId,
    status,
    search,
  }: Pick<BookingListParams, "businessId" | "status" | "search">) {
    const query: Record<string, unknown> = { businessId };
    const normalizedSearch = search?.trim();

    if (status) {
      query.status = status;
    }

    if (normalizedSearch) {
      query.$or = [
        { trackingNumber: { $regex: normalizedSearch, $options: "i" } },
        { userName: { $regex: normalizedSearch, $options: "i" } },
        { userEmail: { $regex: normalizedSearch, $options: "i" } },
        { carNumber: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    return query;
  }

  private buildSelectionQuery({
    businessId,
    selectionMode,
    ids,
    excludeIds,
    search,
    status,
  }: BookingSelectionScope) {
    if (selectionMode === "selected") {
      return {
        businessId,
        _id: { $in: ids },
      };
    }

    const query = this.buildBookingsQuery({
      businessId,
      status,
      search,
    });

    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    return query;
  }

  private async getBookingsForSelection(
    selection: BookingSelectionScope,
  ): Promise<IBooking[]> {
    const query = this.buildSelectionQuery(selection);
    const bookings = await Booking.find(query).sort({ createdAt: -1 });

    if (bookings.length === 0) {
      throw new AppError("No bookings matched the current selection.", 404);
    }

    return bookings;
  }

  async getAllBookings(params: BookingListParams): Promise<{
    bookings: IBooking[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const { businessId, status, page = 1, limit = 20, search } = params;
    const query = this.buildBookingsQuery({ businessId, status, search });
    const normalizedLimit = Math.min(
      MAX_BOOKINGS_PAGE_SIZE,
      Math.max(1, Math.trunc(limit)),
    );
    const requestedPage = Math.max(1, Math.trunc(page));
    const total = await Booking.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));
    const currentPage = Math.min(requestedPage, totalPages);
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * normalizedLimit)
      .limit(normalizedLimit);

    return {
      bookings,
      total,
      page: currentPage,
      totalPages,
      limit: normalizedLimit,
    };
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

      const overtime = pricingService.hasPricingRules({
        pricingRules: booking.pricingRulesSnapshot,
      })
        ? pricingService.calculateOvertime(
            booking.bookedStartTime,
            booking.bookedEndTime,
            exitTime,
            booking.price,
            {
              pricingRules: booking.pricingRulesSnapshot,
            },
            booking.bookedDays,
          )
        : pricingService.isDailySnapshot({
              firstTenDayPrices: booking.firstTenDayPricesSnapshot,
            })
          ? pricingService.calculateOvertime(
              booking.bookedStartTime,
              booking.bookedEndTime,
              exitTime,
              booking.price,
              {
                firstTenDayPrices: booking.firstTenDayPricesSnapshot,
                day11To30Increment: booking.day11To30Increment,
                day31PlusIncrement: booking.day31PlusIncrement,
              },
              booking.bookedDays,
            )
          : pricingService.calculateLegacyOvertime(
              booking.bookedStartTime,
              booking.bookedEndTime,
              exitTime,
              booking.price,
              booking.pricePerHour ?? 0,
            );

      booking.overtimeDays = overtime.overtimeDays;
      booking.overtimeHours = 0;
      booking.overtimePrice = overtime.overtimePrice;
      booking.totalPrice = overtime.newTotalPrice;
    } else {
      booking.status = status;
      booking.actualExitTime = null;
      booking.overtimeDays = 0;
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

  async exportBookingsExcel(
    selection: BookingSelectionScope,
  ): Promise<Buffer> {
    const bookings = await this.getBookingsForSelection(selection);

    const sheet: XlsxSheetData = {
      name: "Bookings",
      columns: [
        { header: "Tracking Number", width: 18 },
        { header: "Customer", width: 22 },
        { header: "Email", width: 28 },
        { header: "Phone", width: 18 },
        { header: "Vehicle", width: 22 },
        { header: "Registration", width: 16 },
        { header: "Drop-off", width: 22 },
        { header: "Pick-up", width: 22 },
        { header: "Actual Exit", width: 22 },
        { header: "Status", width: 14 },
        { header: "Payment Status", width: 18 },
        { header: "Booked Days", width: 14 },
        { header: "Base Price", width: 14, type: "currency" },
        { header: "Overtime Days", width: 14, type: "number" },
        { header: "Overtime Amount", width: 16, type: "currency" },
        { header: "Total Price", width: 14, type: "currency" },
        { header: "Created At", width: 22 },
      ],
      rows: bookings.map((booking) => [
        booking.trackingNumber,
        booking.userName,
        booking.userEmail,
        booking.userPhone,
        `${booking.carMake} ${booking.carModel}`.trim(),
        booking.carNumber,
        formatTimestampForExport(booking.bookedStartTime),
        formatTimestampForExport(booking.bookedEndTime),
        formatTimestampForExport(booking.actualExitTime),
        booking.status,
        booking.paymentStatus,
        formatDayCount(booking.bookedDays ?? 0),
        Number(booking.price ?? 0),
        Number(booking.overtimeDays ?? 0),
        Number(booking.overtimePrice ?? 0),
        Number(booking.totalPrice ?? 0),
        formatTimestampForExport(booking.createdAt),
      ]),
    };

    return buildXlsxWorkbook(sheet);
  }

  async deleteBooking(businessId: string, id: string): Promise<void> {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.businessId.toString() !== businessId) {
      throw new AppError("You are not authorized to delete this booking", 403);
    }

    await Booking.deleteOne({ _id: id, businessId });
  }

  async bulkDeleteBookings(selection: BookingSelectionScope): Promise<{
    deletedCount: number;
    deletedIds: string[];
  }> {
    const bookings = await this.getBookingsForSelection(selection);
    const deletedIds = bookings.map((booking) => booking._id.toString());

    await Booking.deleteMany({
      businessId: selection.businessId,
      _id: { $in: deletedIds },
    });

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    };
  }
}

export const bookingService = new BookingService();
