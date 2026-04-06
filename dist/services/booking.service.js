"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Booking_1 = require("../models/Booking");
const Business_1 = require("../models/Business");
const pricing_service_1 = require("./pricing.service");
const email_service_1 = require("./email.service");
const helpers_1 = require("../utils/helpers");
const xlsx_1 = require("../utils/xlsx");
const errorHandler_1 = require("../middleware/errorHandler");
const bookingLifecycle_1 = require("../utils/bookingLifecycle");
const MAX_BOOKINGS_PAGE_SIZE = 100;
const formatTimestampForExport = (value) => {
    if (!value) {
        return "";
    }
    return value.toISOString().replace("T", " ").slice(0, 16) + " UTC";
};
class BookingService {
    async createBooking(businessId, data) {
        const business = await Business_1.Business.findById(businessId);
        if (!business) {
            throw new errorHandler_1.AppError("Business not found", 404);
        }
        if (business.bookingEnabled === false) {
            throw new errorHandler_1.AppError("Bookings are currently disabled. Please try again later.", 403);
        }
        const startTime = new Date(data.bookedStartTime);
        const endTime = new Date(data.bookedEndTime);
        const priceCalc = await pricing_service_1.pricingService.calculatePrice(businessId, startTime, endTime);
        let trackingNumber;
        let exists = true;
        do {
            trackingNumber = (0, helpers_1.generateTrackingNumber)();
            exists = !!(await Booking_1.Booking.findOne({ trackingNumber }));
        } while (exists);
        const booking = new Booking_1.Booking({
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
        });
        await booking.save();
        return booking;
    }
    async attachStripeSession(bookingId, sessionId) {
        await Booking_1.Booking.findByIdAndUpdate(bookingId, { stripeSessionId: sessionId });
    }
    async confirmPayment(sessionId) {
        const booking = await Booking_1.Booking.findOneAndUpdate({ stripeSessionId: sessionId, paymentStatus: "awaiting_payment" }, { paymentStatus: "paid" }, { new: true });
        if (booking) {
            email_service_1.emailService.sendBookingConfirmation(booking).catch(console.error);
        }
        return booking;
    }
    async cancelPendingBooking(sessionId) {
        await Booking_1.Booking.findOneAndUpdate({ stripeSessionId: sessionId, paymentStatus: "awaiting_payment" }, { status: "cancelled" });
    }
    async getBySessionId(sessionId) {
        return Booking_1.Booking.findOne({ stripeSessionId: sessionId });
    }
    async getByTrackingNumber(businessId, trackingNumber) {
        const booking = await Booking_1.Booking.findOne({
            businessId,
            trackingNumber: trackingNumber.toUpperCase(),
        });
        if (!booking) {
            throw new errorHandler_1.AppError("Booking not found", 404);
        }
        return booking;
    }
    buildBookingsQuery({ businessId, status, search, }) {
        const query = { businessId };
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
    buildSelectionQuery({ businessId, selectionMode, ids, excludeIds, search, status, }) {
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
    async getBookingsForSelection(selection) {
        const query = this.buildSelectionQuery(selection);
        const bookings = await Booking_1.Booking.find(query).sort({ createdAt: -1 });
        if (bookings.length === 0) {
            throw new errorHandler_1.AppError("No bookings matched the current selection.", 404);
        }
        return bookings;
    }
    async getAllBookings(params) {
        const { businessId, status, page = 1, limit = 20, search } = params;
        const query = this.buildBookingsQuery({ businessId, status, search });
        const normalizedLimit = Math.min(MAX_BOOKINGS_PAGE_SIZE, Math.max(1, Math.trunc(limit)));
        const requestedPage = Math.max(1, Math.trunc(page));
        const total = await Booking_1.Booking.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));
        const currentPage = Math.min(requestedPage, totalPages);
        const bookings = await Booking_1.Booking.find(query)
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
    async updateStatus(businessId, id, status, actualExitTime) {
        const booking = await Booking_1.Booking.findById(id);
        if (!booking) {
            throw new errorHandler_1.AppError("Booking not found", 404);
        }
        if (booking.businessId.toString() !== businessId) {
            throw new errorHandler_1.AppError("You are not authorized to update this booking", 403);
        }
        const transitionError = (0, bookingLifecycle_1.getBookingStatusTransitionError)(booking.status, status, booking.bookedStartTime);
        if (transitionError) {
            throw new errorHandler_1.AppError(transitionError, 400);
        }
        if (status !== "cancelled" && booking.paymentStatus !== "paid") {
            throw new errorHandler_1.AppError("Booking cannot be activated or completed until payment is confirmed.", 400);
        }
        if (status === "completed") {
            const exitTime = actualExitTime ? new Date(actualExitTime) : new Date();
            if (Number.isNaN(exitTime.getTime())) {
                throw new errorHandler_1.AppError("Actual exit time is invalid", 400);
            }
            if (exitTime < booking.bookedStartTime) {
                throw new errorHandler_1.AppError("Actual exit time cannot be before the booked start time", 400);
            }
            booking.status = status;
            booking.actualExitTime = exitTime;
            const overtime = pricing_service_1.pricingService.hasPricingRules({
                pricingRules: booking.pricingRulesSnapshot,
            })
                ? pricing_service_1.pricingService.calculateOvertime(booking.bookedStartTime, booking.bookedEndTime, exitTime, booking.price, {
                    pricingRules: booking.pricingRulesSnapshot,
                }, booking.bookedDays)
                : pricing_service_1.pricingService.isDailySnapshot({
                    firstTenDayPrices: booking.firstTenDayPricesSnapshot,
                })
                    ? pricing_service_1.pricingService.calculateOvertime(booking.bookedStartTime, booking.bookedEndTime, exitTime, booking.price, {
                        firstTenDayPrices: booking.firstTenDayPricesSnapshot,
                        day11To30Increment: booking.day11To30Increment,
                        day31PlusIncrement: booking.day31PlusIncrement,
                    }, booking.bookedDays)
                    : pricing_service_1.pricingService.calculateLegacyOvertime(booking.bookedStartTime, booking.bookedEndTime, exitTime, booking.price, booking.pricePerHour ?? 0);
            booking.overtimeDays = overtime.overtimeDays;
            booking.overtimeHours = 0;
            booking.overtimePrice = overtime.overtimePrice;
            booking.totalPrice = overtime.newTotalPrice;
        }
        else {
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
    async getDashboardStats(businessId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const business = await Business_1.Business.findById(businessId);
        const objectBusinessId = new mongoose_1.default.Types.ObjectId(businessId);
        const [totalBookings, activeBookings, upcomingBookings, completedBookings, cancelledBookings, stripeRevenueResult, overtimeResult, todayBookings,] = await Promise.all([
            Booking_1.Booking.countDocuments({ businessId }),
            Booking_1.Booking.countDocuments({ status: "active", businessId }),
            Booking_1.Booking.countDocuments({ status: "upcoming", businessId }),
            Booking_1.Booking.countDocuments({ status: "completed", businessId }),
            Booking_1.Booking.countDocuments({ status: "cancelled", businessId }),
            Booking_1.Booking.aggregate([
                {
                    $match: {
                        businessId: objectBusinessId,
                        paymentStatus: "paid",
                        status: { $in: ["upcoming", "active", "completed"] },
                    },
                },
                { $group: { _id: null, total: { $sum: "$price" } } },
            ]),
            Booking_1.Booking.aggregate([
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
            Booking_1.Booking.countDocuments({
                businessId,
                createdAt: { $gte: today, $lt: tomorrow },
            }),
        ]);
        const stripeRevenue = stripeRevenueResult[0]?.total || 0;
        const overtimeRevenue = overtimeResult[0]?.total || 0;
        const totalRevenue = stripeRevenue + overtimeRevenue;
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
    async exportBookingsExcel(selection) {
        const bookings = await this.getBookingsForSelection(selection);
        const sheet = {
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
                (0, helpers_1.formatDayCount)(booking.bookedDays ?? 0),
                Number(booking.price ?? 0),
                Number(booking.overtimeDays ?? 0),
                Number(booking.overtimePrice ?? 0),
                Number(booking.totalPrice ?? 0),
                formatTimestampForExport(booking.createdAt),
            ]),
        };
        return (0, xlsx_1.buildXlsxWorkbook)(sheet);
    }
    async deleteBooking(businessId, id) {
        const booking = await Booking_1.Booking.findById(id);
        if (!booking) {
            throw new errorHandler_1.AppError("Booking not found", 404);
        }
        if (booking.businessId.toString() !== businessId) {
            throw new errorHandler_1.AppError("You are not authorized to delete this booking", 403);
        }
        await Booking_1.Booking.deleteOne({ _id: id, businessId });
    }
    async bulkDeleteBookings(selection) {
        const bookings = await this.getBookingsForSelection(selection);
        const deletedIds = bookings.map((booking) => booking._id.toString());
        await Booking_1.Booking.deleteMany({
            businessId: selection.businessId,
            _id: { $in: deletedIds },
        });
        return {
            deletedCount: deletedIds.length,
            deletedIds,
        };
    }
}
exports.bookingService = new BookingService();
//# sourceMappingURL=booking.service.js.map