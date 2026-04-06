"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingStatus = exports.calculatePrice = exports.getBookingByTracking = exports.getPricingConfig = exports.createBooking = void 0;
const booking_service_1 = require("../services/booking.service");
const pricing_service_1 = require("../services/pricing.service");
const Business_1 = require("../models/Business");
const AppError_1 = __importDefault(require("../utils/AppError"));
const createBooking = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const booking = await booking_service_1.bookingService.createBooking(businessId, req.body);
        res.status(201).json({ success: true, data: booking });
    }
    catch (error) {
        next(error);
    }
};
exports.createBooking = createBooking;
const getPricingConfig = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const config = await pricing_service_1.pricingService.getConfig(businessId);
        const startingDayPrice = pricing_service_1.pricingService.calculateTotalPriceForDays(1, pricing_service_1.pricingService.getPricingSnapshot(config));
        res.json({ success: true, data: startingDayPrice });
    }
    catch (error) {
        next(error);
    }
};
exports.getPricingConfig = getPricingConfig;
const getBookingByTracking = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const { trackingNumber } = req.params;
        if (!trackingNumber || Array.isArray(trackingNumber)) {
            return next(new AppError_1.default("Invalid tracking number", 400));
        }
        const booking = await booking_service_1.bookingService.getByTrackingNumber(businessId, trackingNumber);
        res.json({ success: true, data: booking });
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingByTracking = getBookingByTracking;
const calculatePrice = async (req, res, next) => {
    try {
        const { startTime, endTime } = req.query;
        const businessId = req.businessId;
        if (!startTime || !endTime) {
            res.status(400).json({
                success: false,
                message: "startTime and endTime are required",
            });
            return;
        }
        const priceCalc = await pricing_service_1.pricingService.calculatePrice(businessId, new Date(startTime), new Date(endTime));
        res.json({ success: true, data: priceCalc });
    }
    catch (error) {
        next(error);
    }
};
exports.calculatePrice = calculatePrice;
/** GET /api/bookings/status — public check: is booking open? */
const getBookingStatus = async (req, res, next) => {
    try {
        const businessId = req.businessId;
        const business = await Business_1.Business.findById(businessId);
        if (!business)
            return next(new AppError_1.default("Business not found", 404));
        res.json({
            success: true,
            data: { bookingEnabled: business.bookingEnabled !== false },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingStatus = getBookingStatus;
//# sourceMappingURL=booking.controller.js.map