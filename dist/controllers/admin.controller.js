"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBookingToggle = exports.getBookingToggle = exports.bulkDeleteBookings = exports.deleteBooking = exports.exportBookings = exports.updateBookingStatus = exports.getAllBookings = exports.getDashboard = void 0;
const booking_service_1 = require("../services/booking.service");
const Business_1 = require("../models/Business");
const AppError_1 = __importDefault(require("../utils/AppError"));
const getDashboard = async (_req, res, next) => {
    try {
        const businessId = _req.businessId;
        const stats = await booking_service_1.bookingService.getDashboardStats(businessId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboard = getDashboard;
const getAllBookings = async (req, res, next) => {
    try {
        const { status, page, limit, search } = req.query;
        const businessId = req.businessId;
        const result = await booking_service_1.bookingService.getAllBookings({
            businessId,
            status: status,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            search: search,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBookings = getAllBookings;
const updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || Array.isArray(id)) {
            return next(new AppError_1.default("Invalid id", 400));
        }
        const { status, actualExitTime } = req.body;
        const businessId = req.businessId;
        const booking = await booking_service_1.bookingService.updateStatus(businessId, id, status, actualExitTime);
        res.json({ success: true, data: booking });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBookingStatus = updateBookingStatus;
const exportBookings = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const workbook = await booking_service_1.bookingService.exportBookingsExcel({
            businessId,
            ...req.body,
        });
        const fileName = `bookings-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.send(workbook);
    }
    catch (error) {
        next(error);
    }
};
exports.exportBookings = exportBookings;
const deleteBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || Array.isArray(id)) {
            return next(new AppError_1.default("Invalid id", 400));
        }
        const businessId = req.businessId;
        await booking_service_1.bookingService.deleteBooking(businessId, id);
        res.json({
            success: true,
            data: { id },
            message: "Booking permanently deleted.",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBooking = deleteBooking;
const bulkDeleteBookings = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const result = await booking_service_1.bookingService.bulkDeleteBookings({
            businessId,
            ...req.body,
        });
        res.json({
            success: true,
            data: result,
            message: `${result.deletedCount} booking(s) permanently deleted.`,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkDeleteBookings = bulkDeleteBookings;
/** GET /admin/booking-toggle — return current bookingEnabled state */
const getBookingToggle = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const business = await Business_1.Business.findById(businessId);
        if (!business)
            return next(new AppError_1.default("Business not found", 404));
        res.json({ success: true, data: { bookingEnabled: business.bookingEnabled !== false } });
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingToggle = getBookingToggle;
/** PATCH /admin/booking-toggle — flip bookingEnabled */
const setBookingToggle = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const { bookingEnabled } = req.body;
        if (typeof bookingEnabled !== "boolean") {
            return next(new AppError_1.default("bookingEnabled must be a boolean", 400));
        }
        const business = await Business_1.Business.findByIdAndUpdate(businessId, { bookingEnabled }, { new: true });
        if (!business)
            return next(new AppError_1.default("Business not found", 404));
        res.json({ success: true, data: { bookingEnabled: business.bookingEnabled } });
    }
    catch (error) {
        next(error);
    }
};
exports.setBookingToggle = setBookingToggle;
//# sourceMappingURL=admin.controller.js.map