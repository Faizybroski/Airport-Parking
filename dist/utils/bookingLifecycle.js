"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingStatusTransitionError = exports.getBookingLifecycleState = exports.getBookingStatusLabel = exports.BOOKING_STATUS_VALUES = void 0;
const helpers_1 = require("./helpers");
const pricing_service_1 = require("../services/pricing.service");
exports.BOOKING_STATUS_VALUES = [
    "upcoming",
    "active",
    "completed",
    "cancelled",
];
const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;
const getBookingStatusLabel = (status) => status === "active" ? "activated" : status;
exports.getBookingStatusLabel = getBookingStatusLabel;
const getBookingLifecycleState = (booking, now = new Date()) => {
    const canActivate = booking.status === "upcoming" && now >= booking.bookedStartTime;
    const canComplete = booking.status === "active";
    const canCancel = booking.status === "upcoming";
    const timeUntilStartHours = booking.status === "upcoming"
        ? roundToTwoDecimals((0, helpers_1.calculateHours)(now, booking.bookedStartTime))
        : 0;
    const timeRemainingHours = booking.status === "active"
        ? roundToTwoDecimals((0, helpers_1.calculateHours)(now, booking.bookedEndTime))
        : 0;
    if (pricing_service_1.pricingService.hasPricingRules({
        pricingRules: booking.pricingRulesSnapshot,
    })) {
        const snapshot = {
            pricingRules: booking.pricingRulesSnapshot,
        };
        const bookedDays = booking.bookedDays ??
            (0, helpers_1.calculateChargeableDays)(booking.bookedStartTime, booking.bookedEndTime);
        const liveActualDays = booking.status === "active" && now > booking.bookedEndTime
            ? (0, helpers_1.calculateChargeableDays)(booking.bookedStartTime, now)
            : bookedDays;
        const liveExtraDays = Math.max(0, liveActualDays - bookedDays);
        const liveTotalPrice = pricing_service_1.pricingService.calculateTotalPriceForDays(liveActualDays, snapshot);
        const liveExtraPrice = roundToTwoDecimals(Math.max(0, liveTotalPrice - booking.totalPrice));
        const finalizedExtraDays = roundToTwoDecimals(booking.overtimeDays ?? 0);
        const isFinalizedLateCharge = booking.status === "completed" && finalizedExtraDays > 0;
        const lateChargeMode = isFinalizedLateCharge
            ? "finalized"
            : liveExtraDays > 0
                ? "pending"
                : "none";
        const uptimeDays = isFinalizedLateCharge
            ? finalizedExtraDays
            : roundToTwoDecimals(liveExtraDays);
        const uptimePrice = isFinalizedLateCharge
            ? roundToTwoDecimals(booking.overtimePrice)
            : liveExtraPrice;
        const currentTotalPrice = lateChargeMode === "pending"
            ? roundToTwoDecimals(booking.totalPrice + uptimePrice)
            : roundToTwoDecimals(booking.totalPrice);
        return {
            statusLabel: (0, exports.getBookingStatusLabel)(booking.status),
            canActivate,
            canComplete,
            canCancel,
            isOvertimeRunning: lateChargeMode === "pending",
            timeUntilStartHours,
            timeRemainingHours,
            uptimeDays,
            uptimePrice,
            currentTotalPrice,
            lateChargeMode,
        };
    }
    if (pricing_service_1.pricingService.isDailySnapshot({
        firstTenDayPrices: booking.firstTenDayPricesSnapshot,
    })) {
        const snapshot = {
            firstTenDayPrices: booking.firstTenDayPricesSnapshot,
            day11To30Increment: booking.day11To30Increment ?? 3,
            day31PlusIncrement: booking.day31PlusIncrement ?? 2,
        };
        const bookedDays = booking.bookedDays ??
            (0, helpers_1.calculateChargeableDays)(booking.bookedStartTime, booking.bookedEndTime);
        const liveActualDays = booking.status === "active" && now > booking.bookedEndTime
            ? (0, helpers_1.calculateChargeableDays)(booking.bookedStartTime, now)
            : bookedDays;
        const liveExtraDays = Math.max(0, liveActualDays - bookedDays);
        const liveTotalPrice = pricing_service_1.pricingService.calculateTotalPriceForDays(liveActualDays, snapshot);
        const liveExtraPrice = roundToTwoDecimals(Math.max(0, liveTotalPrice - booking.totalPrice));
        const finalizedExtraDays = roundToTwoDecimals(booking.overtimeDays ?? 0);
        const isFinalizedLateCharge = booking.status === "completed" && finalizedExtraDays > 0;
        const lateChargeMode = isFinalizedLateCharge
            ? "finalized"
            : liveExtraDays > 0
                ? "pending"
                : "none";
        const uptimeDays = isFinalizedLateCharge
            ? finalizedExtraDays
            : roundToTwoDecimals(liveExtraDays);
        const uptimePrice = isFinalizedLateCharge
            ? roundToTwoDecimals(booking.overtimePrice)
            : liveExtraPrice;
        const currentTotalPrice = lateChargeMode === "pending"
            ? roundToTwoDecimals(booking.totalPrice + uptimePrice)
            : roundToTwoDecimals(booking.totalPrice);
        return {
            statusLabel: (0, exports.getBookingStatusLabel)(booking.status),
            canActivate,
            canComplete,
            canCancel,
            isOvertimeRunning: lateChargeMode === "pending",
            timeUntilStartHours,
            timeRemainingHours,
            uptimeDays,
            uptimePrice,
            currentTotalPrice,
            lateChargeMode,
        };
    }
    // Legacy hourly fallback for older bookings.
    const liveUptimeHours = booking.status === "active" && now > booking.bookedEndTime
        ? roundToTwoDecimals((0, helpers_1.calculateHours)(booking.bookedEndTime, now))
        : 0;
    const liveUptimePrice = roundToTwoDecimals(liveUptimeHours * (booking.pricePerHour ?? 0));
    const finalizedLegacyOvertimeHours = booking.status === "completed" ? booking.overtimeHours ?? 0 : 0;
    const isFinalizedLateCharge = finalizedLegacyOvertimeHours > 0;
    const lateChargeMode = isFinalizedLateCharge
        ? "finalized"
        : liveUptimeHours > 0
            ? "pending"
            : "none";
    const uptimePrice = isFinalizedLateCharge
        ? roundToTwoDecimals(booking.overtimePrice)
        : liveUptimePrice;
    const currentTotalPrice = lateChargeMode === "pending"
        ? roundToTwoDecimals(booking.totalPrice + uptimePrice)
        : roundToTwoDecimals(booking.totalPrice);
    return {
        statusLabel: (0, exports.getBookingStatusLabel)(booking.status),
        canActivate,
        canComplete,
        canCancel,
        isOvertimeRunning: lateChargeMode === "pending",
        timeUntilStartHours,
        timeRemainingHours,
        uptimeDays: roundToTwoDecimals(liveUptimeHours / 24),
        uptimePrice,
        currentTotalPrice,
        lateChargeMode,
    };
};
exports.getBookingLifecycleState = getBookingLifecycleState;
const getBookingStatusTransitionError = (currentStatus, nextStatus, bookedStartTime, now = new Date()) => {
    if (currentStatus === nextStatus) {
        return `Booking is already ${(0, exports.getBookingStatusLabel)(currentStatus)}.`;
    }
    if (currentStatus === "completed") {
        return "Completed bookings cannot be updated.";
    }
    if (currentStatus === "cancelled") {
        return "Cancelled bookings cannot be updated.";
    }
    if (currentStatus === "upcoming") {
        if (nextStatus === "active") {
            if (now < bookedStartTime) {
                return "Booking can only be activated on or after its booked start time.";
            }
            return null;
        }
        if (nextStatus === "cancelled") {
            return null;
        }
        return "Upcoming bookings can only be activated or cancelled.";
    }
    if (currentStatus === "active") {
        if (nextStatus === "completed") {
            return null;
        }
        return "Activated bookings can only be completed.";
    }
    return "Invalid booking status transition.";
};
exports.getBookingStatusTransitionError = getBookingStatusTransitionError;
//# sourceMappingURL=bookingLifecycle.js.map