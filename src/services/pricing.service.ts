import { PricingConfig, IPricingConfig } from "../models/PricingConfig";
import { calculateHours, hoursToDays } from "../utils/helpers";
import { AppError } from "../middleware/errorHandler";

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

class PricingService {
  /**
   * Get current pricing config
   */
  async getConfig(businessId: string): Promise<IPricingConfig> {
    // const config = await PricingConfig.findOne().sort({ createdAt: -1 });
    const config = await PricingConfig.findOne({ businessId }).sort({
      createdAt: -1,
    });

    if (!config) {
      throw new AppError(
        "Pricing config not found. Please seed the database.",
        500,
      );
    }
    return config;
  }

  /**
   * Update or create pricing config
   */
  async updateConfig(
    businessId: string,
    pricePerHour: number,
    discountRules: { minDays: number; percentage: number }[],
  ): Promise<IPricingConfig> {
    // Sort discount rules by minDays ascending
    const sortedRules = [...discountRules].sort(
      (a, b) => a.minDays - b.minDays,
    );

    let config = await PricingConfig.findOne({ businessId }).sort({
      createdAt: -1,
    });
    if (config) {
      config.pricePerHour = pricePerHour;
      config.discountRules = sortedRules;
      await config.save();
    } else {
      config = await PricingConfig.create({
        businessId,
        pricePerHour,
        discountRules: sortedRules,
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

    const totalHours = calculateHours(startTime, endTime);
    const totalDays = hoursToDays(totalHours);
    const pricePerHour = config.pricePerHour;

    // Find best matching discount tier
    let discountPercent = 0;
    for (const rule of config.discountRules) {
      if (totalDays >= rule.minDays) {
        discountPercent = rule.percentage;
      }
    }

    const basePrice = totalHours * pricePerHour;
    const discountAmount = basePrice * (discountPercent / 100);
    const finalPrice = Math.round((basePrice - discountAmount) * 100) / 100;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalDays: Math.round(totalDays * 100) / 100,
      pricePerHour,
      basePrice: Math.round(basePrice * 100) / 100,
      discountPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice,
    };
  }

  /**
   * Calculate overtime price
   */
  calculateOvertime(
    bookedStartTime: Date,
    bookedEndTime: Date,
    actualExitTime: Date,
    originalPrice: number,
    pricePerHour: number,
  ): OvertimeCalculation {
    const bookedHours = calculateHours(bookedStartTime, bookedEndTime);
    const actualHours = calculateHours(bookedStartTime, actualExitTime);
    const overtimeHours = calculateHours(bookedEndTime, actualExitTime);
    const overtimePrice =
      Math.round(overtimeHours * pricePerHour * 100) / 100;
    const newTotalPrice =
      Math.round((originalPrice + overtimePrice) * 100) / 100;

    return {
      bookedHours: Math.round(bookedHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      overtimePrice,
      newTotalPrice,
    };
  }
}

export const pricingService = new PricingService();
