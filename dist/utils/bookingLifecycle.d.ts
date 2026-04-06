import { IPricingRule } from "../models/PricingConfig";
export declare const BOOKING_STATUS_VALUES: readonly ["upcoming", "active", "completed", "cancelled"];
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];
export type LateChargeMode = "none" | "pending" | "finalized";
export interface BookingLifecycleSource {
    status: BookingStatus;
    bookedStartTime: Date;
    bookedEndTime: Date;
    actualExitTime?: Date | null;
    bookedDays?: number;
    overtimeDays?: number;
    overtimeHours?: number;
    overtimePrice: number;
    totalPrice: number;
    pricingRulesSnapshot?: IPricingRule[];
    firstTenDayPricesSnapshot?: number[];
    day11To30Increment?: number;
    day31PlusIncrement?: number;
    pricePerHour?: number;
}
export interface BookingLifecycleState {
    statusLabel: string;
    canActivate: boolean;
    canComplete: boolean;
    canCancel: boolean;
    isOvertimeRunning: boolean;
    timeUntilStartHours: number;
    timeRemainingHours: number;
    uptimeDays: number;
    uptimePrice: number;
    currentTotalPrice: number;
    lateChargeMode: LateChargeMode;
}
export declare const getBookingStatusLabel: (status: BookingStatus) => string;
export declare const getBookingLifecycleState: (booking: BookingLifecycleSource, now?: Date) => BookingLifecycleState;
export declare const getBookingStatusTransitionError: (currentStatus: BookingStatus, nextStatus: BookingStatus, bookedStartTime: Date, now?: Date) => string | null;
//# sourceMappingURL=bookingLifecycle.d.ts.map