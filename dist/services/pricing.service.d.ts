import { IPricingConfig } from "../models/PricingConfig";
export interface PriceCalculation {
    totalHours: number;
    totalDays: number;
    pricePerHour: number;
    basePrice: number;
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
}
export interface OvertimeCalculation {
    bookedHours: number;
    actualHours: number;
    overtimeHours: number;
    overtimePrice: number;
    newTotalPrice: number;
}
declare class PricingService {
    /**
     * Get current pricing config
     */
    getConfig(businessId: string): Promise<IPricingConfig>;
    /**
     * Update or create pricing config
     */
    updateConfig(businessId: string, pricePerHour: number, discountRules: {
        minDays: number;
        percentage: number;
    }[]): Promise<IPricingConfig>;
    /**
     * Calculate price for a booking
     */
    calculatePrice(businessId: string, startTime: Date, endTime: Date): Promise<PriceCalculation>;
    /**
     * Calculate overtime price
     */
    calculateOvertime(bookedStartTime: Date, bookedEndTime: Date, actualExitTime: Date, originalPrice: number, pricePerHour: number): OvertimeCalculation;
}
export declare const pricingService: PricingService;
export {};
//# sourceMappingURL=pricing.service.d.ts.map