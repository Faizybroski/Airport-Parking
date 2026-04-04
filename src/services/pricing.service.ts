import { PricingConfig, IPricingConfig } from "../models/PricingConfig";
import { calculateChargeableDays, calculateHours } from "../utils/helpers";
import { AppError } from "../middleware/errorHandler";

export const FIRST_TEN_DAYS_COUNT = 10;
export const DAY_11_TO_30_INCREMENT = 3;
export const DAY_31_PLUS_INCREMENT = 2;

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

const roundToTwoDecimals = (value: number): number =>
  Math.round(value * 100) / 100;

const normalizeFirstTenDayPrices = (prices: number[]): number[] =>
  prices.slice(0, FIRST_TEN_DAYS_COUNT).map((price) => roundToTwoDecimals(price));

const deriveLegacyFirstTenDayPrices = (config: IPricingConfig): number[] => {
  if (
    Array.isArray(config.firstTenDayPrices) &&
    config.firstTenDayPrices.length === FIRST_TEN_DAYS_COUNT
  ) {
    return normalizeFirstTenDayPrices(config.firstTenDayPrices);
  }

  const legacyHourlyPrice = config.pricePerHour ?? 0;
  return Array.from({ length: FIRST_TEN_DAYS_COUNT }, (_, index) =>
    roundToTwoDecimals(legacyHourlyPrice * 24 * (index + 1)),
  );
};

class PricingService {
  getPricingSnapshot(firstTenDayPrices: number[]): DailyPricingSnapshot {
    return {
      firstTenDayPrices: normalizeFirstTenDayPrices(firstTenDayPrices),
      day11To30Increment: DAY_11_TO_30_INCREMENT,
      day31PlusIncrement: DAY_31_PLUS_INCREMENT,
    };
  }

  isDailySnapshot(snapshot?: Partial<DailyPricingSnapshot> | null): boolean {
    return (
      Array.isArray(snapshot?.firstTenDayPrices) &&
      snapshot.firstTenDayPrices.length === FIRST_TEN_DAYS_COUNT
    );
  }

  calculateTotalPriceForDays(
    totalDays: number,
    snapshot: DailyPricingSnapshot,
  ): number {
    if (totalDays <= 0) {
      return 0;
    }

    if (totalDays <= FIRST_TEN_DAYS_COUNT) {
      return roundToTwoDecimals(snapshot.firstTenDayPrices[totalDays - 1] ?? 0);
    }

    const dayTenPrice = snapshot.firstTenDayPrices[FIRST_TEN_DAYS_COUNT - 1] ?? 0;
    const daysFrom11To30 = Math.min(totalDays, 30) - FIRST_TEN_DAYS_COUNT;
    const daysFrom31Plus = Math.max(0, totalDays - 30);

    return roundToTwoDecimals(
      dayTenPrice +
        daysFrom11To30 * snapshot.day11To30Increment +
        daysFrom31Plus * snapshot.day31PlusIncrement,
    );
  }

  /**
   * Get current pricing config
   */
  async getConfig(businessId: string): Promise<IPricingConfig> {
    const config = await PricingConfig.findOne({ businessId }).sort({
      createdAt: -1,
    });

    if (!config) {
      throw new AppError(
        "Pricing config not found. Please seed the database.",
        500,
      );
    }

    if (
      !Array.isArray(config.firstTenDayPrices) ||
      config.firstTenDayPrices.length !== FIRST_TEN_DAYS_COUNT
    ) {
      config.firstTenDayPrices = deriveLegacyFirstTenDayPrices(config);
    }

    return config;
  }

  /**
   * Update or create pricing config
   */
  async updateConfig(
    businessId: string,
    firstTenDayPrices: number[],
  ): Promise<IPricingConfig> {
    if (firstTenDayPrices.length !== FIRST_TEN_DAYS_COUNT) {
      throw new AppError("Exactly 10 day prices are required.", 400);
    }

    const normalizedPrices = normalizeFirstTenDayPrices(firstTenDayPrices);

    let config = await PricingConfig.findOne({ businessId }).sort({
      createdAt: -1,
    });
    if (config) {
      config.firstTenDayPrices = normalizedPrices;
      config.pricePerHour = undefined;
      config.discountRules = undefined;
      await config.save();
    } else {
      config = await PricingConfig.create({
        businessId,
        firstTenDayPrices: normalizedPrices,
      });
    }
    return config;
  }

  /**
   * Calculate price for a booking
   */
  async calculatePrice(
    businessId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<PriceCalculation> {
    const config = await this.getConfig(businessId);
    const snapshot = this.getPricingSnapshot(config.firstTenDayPrices);
    const totalHours = calculateHours(startTime, endTime);
    const totalDays = calculateChargeableDays(startTime, endTime);
    const finalPrice = this.calculateTotalPriceForDays(totalDays, snapshot);

    return {
      totalHours: roundToTwoDecimals(totalHours),
      totalDays,
      basePrice: finalPrice,
      finalPrice,
      ...snapshot,
    };
  }

  /**
   * Calculate extra daily charges for late pickup.
   */
  calculateOvertime(
    bookedStartTime: Date,
    bookedEndTime: Date,
    actualExitTime: Date,
    originalPrice: number,
    snapshot: DailyPricingSnapshot,
    bookedDays?: number,
  ): OvertimeCalculation {
    const bookedHours = calculateHours(bookedStartTime, bookedEndTime);
    const actualHours = calculateHours(bookedStartTime, actualExitTime);
    const normalizedBookedDays =
      bookedDays ?? calculateChargeableDays(bookedStartTime, bookedEndTime);
    const actualDays = calculateChargeableDays(bookedStartTime, actualExitTime);
    const overtimeDays = Math.max(0, actualDays - normalizedBookedDays);
    const newTotalPrice = this.calculateTotalPriceForDays(actualDays, snapshot);
    const overtimePrice = roundToTwoDecimals(
      Math.max(0, newTotalPrice - originalPrice),
    );

    return {
      bookedHours: roundToTwoDecimals(bookedHours),
      actualHours: roundToTwoDecimals(actualHours),
      bookedDays: normalizedBookedDays,
      actualDays,
      overtimeDays,
      overtimePrice,
      newTotalPrice: roundToTwoDecimals(newTotalPrice),
    };
  }

  /**
   * Legacy hourly overtime calculation kept for older bookings created before
   * the day-based tariff migration.
   */
  calculateLegacyOvertime(
    bookedStartTime: Date,
    bookedEndTime: Date,
    actualExitTime: Date,
    originalPrice: number,
    pricePerHour: number,
  ): OvertimeCalculation {
    const bookedHours = calculateHours(bookedStartTime, bookedEndTime);
    const actualHours = calculateHours(bookedStartTime, actualExitTime);
    const overtimeHours = calculateHours(bookedEndTime, actualExitTime);
    const overtimePrice = roundToTwoDecimals(overtimeHours * pricePerHour);
    const newTotalPrice = roundToTwoDecimals(originalPrice + overtimePrice);
    const bookedDays = calculateChargeableDays(bookedStartTime, bookedEndTime);
    const actualDays = calculateChargeableDays(bookedStartTime, actualExitTime);

    return {
      bookedHours: roundToTwoDecimals(bookedHours),
      actualHours: roundToTwoDecimals(actualHours),
      bookedDays,
      actualDays,
      overtimeDays: Math.max(0, actualDays - bookedDays),
      overtimePrice,
      newTotalPrice,
    };
  }
}

export const pricingService = new PricingService();
