"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingStatusTransitionError = exports.getBookingLifecycleState = exports.getBookingStatusLabel = exports.BOOKING_STATUS_VALUES = void 0;
const helpers_1 = require("./helpers");
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
    const liveUptimeHours = booking.status === "active" && now > booking.bookedEndTime
        ? roundToTwoDecimals((0, helpers_1.calculateHours)(booking.bookedEndTime, now))
        : 0;
    const liveUptimePrice = roundToTwoDecimals(liveUptimeHours * booking.pricePerHour);
    const isFinalizedLateCharge = booking.status === "completed" && booking.overtimeHours > 0;
    const lateChargeMode = isFinalizedLateCharge
        ? "finalized"
        : liveUptimeHours > 0
            ? "pending"
            : "none";
    const uptimeHours = isFinalizedLateCharge
        ? roundToTwoDecimals(booking.overtimeHours)
        : liveUptimeHours;
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
        uptimeHours,
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