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
const errorHandler_1 = require("../middleware/errorHandler");
const bookingLifecycle_1 = require("../utils/bookingLifecycle");
class BookingService {
    async createBooking(businessId, data) {
        // Check if booking is enabled for this business
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
        // Generate unique tracking number
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
            firstTenDayPricesSnapshot: priceCalc.firstTenDayPrices,
            day11To30Increment: priceCalc.day11To30Increment,
            day31PlusIncrement: priceCalc.day31PlusIncrement,
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
        const booking = await Booking_1.Booking.findOneAndUpdate({ stripeSessionId: sessionId, paymentStatus: 'awaiting_payment' }, { paymentStatus: 'paid' }, { new: true });
        if (booking) {
            email_service_1.emailService.sendBookingConfirmation(booking).catch(console.error);
        }
        return booking;
    }
    async cancelPendingBooking(sessionId) {
        await Booking_1.Booking.findOneAndUpdate({ stripeSessionId: sessionId, paymentStatus: 'awaiting_payment' }, { status: 'cancelled' });
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
    async getAllBookings(params) {
        const { businessId, status, page = 1, limit = 20, search } = params;
        const query = {};
        if (businessId)
            query.businessId = businessId;
        if (status)
            query.status = status;
        if (search) {
            query.$or = [
                { trackingNumber: { $regex: search, $options: "i" } },
                { userName: { $regex: search, $options: "i" } },
                { userEmail: { $regex: search, $options: "i" } },
                { carNumber: { $regex: search, $options: "i" } },
            ];
        }
        const total = await Booking_1.Booking.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const bookings = await Booking_1.Booking.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        return { bookings, total, page, totalPages };
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
            const overtime = pricing_service_1.pricingService.isDailySnapshot({
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
            // Base online revenue: sum of the prepaid booking amount for paid,
            // non-cancelled bookings.
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
            // Extra pickup revenue is finalized once the booking is completed.
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
    async exportBookingsCSV(businessId, status) {
        const query = {};
        if (businessId)
            query.businessId = businessId;
        if (status)
            query.status = status;
        const bookings = await Booking_1.Booking.find(query).sort({ createdAt: -1 });
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
            "Booked Days",
            "Price (£)",
            "Overtime Days",
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
            String(b.bookedDays ?? 0),
            b.price.toFixed(2),
            Number(b.overtimeDays ?? 0).toFixed(0),
            b.totalPrice.toFixed(2),
            new Date(b.createdAt).toISOString(),
        ]);
        return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }
}
exports.bookingService = new BookingService();
//# sourceMappingURL=booking.service.js.map