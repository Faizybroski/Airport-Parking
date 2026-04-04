import { IPricingConfig } from "../models/PricingConfig";
export declare const FIRST_TEN_DAYS_COUNT = 10;
export declare const DAY_11_TO_30_INCREMENT = 3;
export declare const DAY_31_PLUS_INCREMENT = 2;
export interface DailyPricingSnapshot {
    firstTenDayPrices: number[];
    day11To30Increment: number;
    day31PlusIncrement: number;
}
export interface PriceCalculation extends DailyPricingSnapshot {
    totalHours: number;
    totalDays: number;
    basePrice: number;
    finalPrice: number;
}
export interface OvertimeCalculation {
    bookedHours: number;
    actualHours: number;
    bookedDays: number;
    actualDays: number;
    overtimeDays: number;
    overtimePrice: number;
    newTotalPrice: number;
}
declare class PricingService {
    getPricingSnapshot(firstTenDayPrices: number[]): DailyPricingSnapshot;
    isDailySnapshot(snapshot?: Partial<DailyPricingSnapshot> | null): boolean;
    calculateTotalPriceForDays(totalDays: number, snapshot: DailyPricingSnapshot): number;
    /**
     * Get current pricing config
     */
    getConfig(businessId: string): Promise<IPricingConfig>;
    /**
     * Update or create pricing config
     */
    updateConfig(businessId: string, firstTenDayPrices: number[]): Promise<IPricingConfig>;
    /**
     * Calculate price for a booking
     */
    calculatePrice(businessId: string, startTime: Date, endTime: Date): Promise<PriceCalculation>;
    /**
     * Calculate extra daily charges for late pickup.
     */
    calculateOvertime(bookedStartTime: Date, bookedEndTime: Date, actualExitTime: Date, originalPrice: number, snapshot: DailyPricingSnapshot, bookedDays?: number): OvertimeCalculation;
    /**
     * Legacy hourly overtime calculation kept for older bookings created before
     * the day-based tariff migration.
     */
    calculateLegacyOvertime(bookedStartTime: Date, bookedEndTime: Date, actualExitTime: Date, originalPrice: number, pricePerHour: number): OvertimeCalculation;
}
export declare const pricingService: PricingService;
export {};
//# sourceMappingURL=pricing.service.d.ts.map