import { calculateHours } from "./helpers";

export const BOOKING_STATUS_VALUES = [
  "upcoming",
  "active",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];

export type LateChargeMode = "none" | "pending" | "finalized";

export interface BookingLifecycleSource {
  status: BookingStatus;
  bookedStartTime: Date;
  bookedEndTime: Date;
  actualExitTime?: Date | null;
  overtimeHours: number;
  overtimePrice: number;
  totalPrice: number;
  pricePerHour: number;
}

export interface BookingLifecycleState {
  statusLabel: string;
  canActivate: boolean;
  canComplete: boolean;
  canCancel: boolean;
  isOvertimeRunning: boolean;
  timeUntilStartHours: number;
  timeRemainingHours: number;
  uptimeHours: number;
  uptimePrice: number;
  currentTotalPrice: number;
  lateChargeMode: LateChargeMode;
}

const roundToTwoDecimals = (value: number): number =>
  Math.round(value * 100) / 100;

export const getBookingStatusLabel = (status: BookingStatus): string =>
  status === "active" ? "activated" : status;

export const getBookingLifecycleState = (
  booking: BookingLifecycleSource,
  now: Date = new Date(),
): BookingLifecycleState => {
  const canActivate =
    booking.status === "upcoming" && now >= booking.bookedStartTime;
  const canComplete = booking.status === "active";
  const canCancel = booking.status === "upcoming";

  const timeUntilStartHours =
    booking.status === "upcoming"
      ? roundToTwoDecimals(calculateHours(now, booking.bookedStartTime))
      : 0;

  const timeRemainingHours =
    booking.status === "active"
      ? roundToTwoDecimals(calculateHours(now, booking.bookedEndTime))
      : 0;

  const liveUptimeHours =
    booking.status === "active" && now > booking.bookedEndTime
      ? roundToTwoDecimals(calculateHours(booking.bookedEndTime, now))
      : 0;

  const liveUptimePrice = roundToTwoDecimals(
    liveUptimeHours * booking.pricePerHour,
  );

  const isFinalizedLateCharge =
    booking.status === "completed" && booking.overtimeHours > 0;

  const lateChargeMode: LateChargeMode = isFinalizedLateCharge
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

  const currentTotalPrice =
    lateChargeMode === "pending"
      ? roundToTwoDecimals(booking.totalPrice + uptimePrice)
      : roundToTwoDecimals(booking.totalPrice);

  return {
    statusLabel: getBookingStatusLabel(booking.status),
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

export const getBookingStatusTransitionError = (
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  bookedStartTime: Date,
  now: Date = new Date(),
): string | null => {
  if (currentStatus === nextStatus) {
    return `Booking is already ${getBookingStatusLabel(currentStatus)}.`;
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
