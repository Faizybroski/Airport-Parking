import {
  PricingConfig,
  IPricingConfig,
  IPricingRule,
} from "../models/PricingConfig";
import { calculateChargeableDays, calculateHours } from "../utils/helpers";
import { AppError } from "../middleware/errorHandler";

export const FIRST_TEN_DAYS_COUNT = 10;
export const DAY_11_TO_30_INCREMENT = 3;
export const DAY_31_PLUS_INCREMENT = 2;

export interface LegacyPricingSnapshot {
  firstTenDayPrices?: number[];
  day11To30Increment?: number;
  day31PlusIncrement?: number;
}

export interface PricingSnapshot {
  pricingRules: IPricingRule[];
}

export interface PriceCalculation extends PricingSnapshot {
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

export interface UpdatePricingConfigInput {
  pricingRules?: IPricingRule[];
  firstTenDayPrices?: number[];
  day11To30Increment?: number;
  day31PlusIncrement?: number;
}

export interface TieredPricingConfig {
  firstTenDayPrices: number[];
  day11To30Increment: number;
  day31PlusIncrement: number;
}

export interface PricingBreakdownEntry {
  day: number;
  price: number;
  tier: 1 | 2 | 3;
}

export interface PricingBreakdown {
  requestedDays: number;
  totalPrice: number;
  breakdown: PricingBreakdownEntry[];
  tieredConfig: TieredPricingConfig;
}

type ResolvablePricingSnapshot = Partial<PricingSnapshot & LegacyPricingSnapshot>;

const roundToTwoDecimals = (value: number): number =>
  Math.round(value * 100) / 100;

const normalizeFirstTenDayPrices = (prices: number[]): number[] =>
  prices
    .slice(0, FIRST_TEN_DAYS_COUNT)
    .map((price) => roundToTwoDecimals(price));

const normalizePricingRule = (rule: IPricingRule): IPricingRule => ({
  startDay: Math.trunc(rule.startDay),
  endDay:
    rule.endDay === null || rule.endDay === undefined
      ? null
      : Math.trunc(rule.endDay),
  basePrice: roundToTwoDecimals(rule.basePrice),
  dailyIncrement: roundToTwoDecimals(rule.dailyIncrement),
});

const normalizePricingRules = (rules: IPricingRule[]): IPricingRule[] =>
  rules.map(normalizePricingRule).sort((a, b) => a.startDay - b.startDay);

const validatePricingRules = (rules: IPricingRule[]): void => {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new AppError("At least one pricing rule is required.", 400);
  }

  let expectedStartDay = 1;

  rules.forEach((rule, index) => {
    if (!Number.isInteger(rule.startDay) || rule.startDay < 1) {
      throw new AppError("Pricing rule start days must be whole numbers.", 400);
    }

    if (
      rule.endDay !== null &&
      rule.endDay !== undefined &&
      (!Number.isInteger(rule.endDay) || rule.endDay < rule.startDay)
    ) {
      throw new AppError(
        "Pricing rule end days must be greater than or equal to start days.",
        400,
      );
    }

    if (rule.basePrice < 0 || rule.dailyIncrement < 0) {
      throw new AppError("Pricing rule amounts cannot be negative.", 400);
    }

    if (rule.startDay !== expectedStartDay) {
      throw new AppError(
        "Pricing rules must start at day 1 and stay continuous without gaps.",
        400,
      );
    }

    const isLastRule = index === rules.length - 1;

    if (!isLastRule && (rule.endDay === null || rule.endDay === undefined)) {
      throw new AppError(
        "Only the final pricing rule can leave the end day open-ended.",
        400,
      );
    }

    if (!isLastRule) {
      expectedStartDay = (rule.endDay as number) + 1;
    }
  });

  const lastRule = rules[rules.length - 1];
  if (lastRule.endDay !== null && lastRule.endDay !== undefined) {
    throw new AppError(
      "The final pricing rule must be open-ended so every booking length has a price.",
      400,
    );
  }
};

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

const buildLegacyPricingRules = (
  firstTenDayPrices: number[],
  day11To30Increment: number = DAY_11_TO_30_INCREMENT,
  day31PlusIncrement: number = DAY_31_PLUS_INCREMENT,
): IPricingRule[] => {
  const normalizedFirstTen = normalizeFirstTenDayPrices(firstTenDayPrices);
  const dayTenPrice = normalizedFirstTen[FIRST_TEN_DAYS_COUNT - 1] ?? 0;
  const day11Price = roundToTwoDecimals(dayTenPrice + day11To30Increment);
  const day31Price = roundToTwoDecimals(
    dayTenPrice + 20 * day11To30Increment + day31PlusIncrement,
  );

  return [
    ...normalizedFirstTen.map((price, index) => ({
      startDay: index + 1,
      endDay: index + 1,
      basePrice: price,
      dailyIncrement: 0,
    })),
    {
      startDay: 11,
      endDay: 30,
      basePrice: day11Price,
      dailyIncrement: roundToTwoDecimals(day11To30Increment),
    },
    {
      startDay: 31,
      endDay: null,
      basePrice: day31Price,
      dailyIncrement: roundToTwoDecimals(day31PlusIncrement),
    },
  ];
};

/**
 * Try to extract firstTenDayPrices and increment values from stored pricingRules,
 * for configs saved before the new UI was introduced.
 */
const extractTieredConfigFromRules = (
  rules: IPricingRule[],
): TieredPricingConfig | null => {
  const sorted = normalizePricingRules(rules);
  if (sorted.length < 3) return null;

  // Expect first 10 rules to each cover exactly one day
  const firstTenRules = sorted.slice(0, FIRST_TEN_DAYS_COUNT);
  const allSingleDay = firstTenRules.every(
    (r, i) => r.startDay === i + 1 && r.endDay === i + 1,
  );
  if (!allSingleDay) return null;

  const tier2Rule = sorted.find((r) => r.startDay === 11 && r.endDay === 30);
  const tier3Rule = sorted.find(
    (r) => r.startDay === 31 && (r.endDay === null || r.endDay === undefined),
  );
  if (!tier2Rule || !tier3Rule) return null;

  return {
    firstTenDayPrices: firstTenRules.map((r) => r.basePrice),
    day11To30Increment: tier2Rule.dailyIncrement,
    day31PlusIncrement: tier3Rule.dailyIncrement,
  };
};

class PricingService {
  hasPricingRules(snapshot?: Partial<PricingSnapshot> | null): boolean {
    return (
      Array.isArray(snapshot?.pricingRules) && snapshot.pricingRules.length > 0
    );
  }

  isDailySnapshot(snapshot?: Partial<LegacyPricingSnapshot> | null): boolean {
    return (
      Array.isArray(snapshot?.firstTenDayPrices) &&
      snapshot.firstTenDayPrices.length === FIRST_TEN_DAYS_COUNT
    );
  }

  private resolvePricingRules(
    snapshot?: ResolvablePricingSnapshot | null,
  ): IPricingRule[] {
    const pricingRules = snapshot?.pricingRules;
    if (Array.isArray(pricingRules) && pricingRules.length > 0) {
      const rules = normalizePricingRules(pricingRules);
      validatePricingRules(rules);
      return rules;
    }

    const firstTenDayPrices = snapshot?.firstTenDayPrices;
    if (
      Array.isArray(firstTenDayPrices) &&
      firstTenDayPrices.length === FIRST_TEN_DAYS_COUNT
    ) {
      return buildLegacyPricingRules(
        firstTenDayPrices,
        snapshot?.day11To30Increment,
        snapshot?.day31PlusIncrement,
      );
    }

    return [];
  }

  getPricingSnapshot(
    config: Pick<IPricingConfig, "pricingRules" | "firstTenDayPrices" | "pricePerHour">,
  ): PricingSnapshot {
    const pricingRules = this.resolvePricingRules(
      this.hasPricingRules(config)
        ? { pricingRules: config.pricingRules }
        : {
            firstTenDayPrices:
              config.firstTenDayPrices?.length === FIRST_TEN_DAYS_COUNT
                ? config.firstTenDayPrices
                : deriveLegacyFirstTenDayPrices(config as IPricingConfig),
          },
    );

    return { pricingRules };
  }

  /**
   * Resolve the tiered pricing configuration (firstTenDayPrices + increments)
   * from a stored config, regardless of how it was originally saved.
   */
  getTieredConfig(config: IPricingConfig): TieredPricingConfig {
    // Prefer explicitly stored values
    if (
      Array.isArray(config.firstTenDayPrices) &&
      config.firstTenDayPrices.length === FIRST_TEN_DAYS_COUNT
    ) {
      return {
        firstTenDayPrices: normalizeFirstTenDayPrices(config.firstTenDayPrices),
        day11To30Increment: config.day11To30Increment ?? DAY_11_TO_30_INCREMENT,
        day31PlusIncrement: config.day31PlusIncrement ?? DAY_31_PLUS_INCREMENT,
      };
    }

    // Try to extract from pricingRules
    if (Array.isArray(config.pricingRules) && config.pricingRules.length > 0) {
      const extracted = extractTieredConfigFromRules(config.pricingRules);
      if (extracted) return extracted;
    }

    // Fall back to legacy hourly-derived prices
    const legacyPrices = deriveLegacyFirstTenDayPrices(config);
    return {
      firstTenDayPrices: legacyPrices,
      day11To30Increment: DAY_11_TO_30_INCREMENT,
      day31PlusIncrement: DAY_31_PLUS_INCREMENT,
    };
  }

  calculateTotalPriceForDays(
    totalDays: number,
    snapshot: ResolvablePricingSnapshot,
  ): number {
    if (totalDays <= 0) {
      return 0;
    }

    const pricingRules = this.resolvePricingRules(snapshot);
    const rule = pricingRules.find(
      (currentRule) =>
        totalDays >= currentRule.startDay &&
        (currentRule.endDay === null ||
          currentRule.endDay === undefined ||
          totalDays <= currentRule.endDay),
    );

    if (!rule) {
      throw new AppError(
        `Pricing rules do not cover bookings of ${totalDays} days.`,
        500,
      );
    }

    return roundToTwoDecimals(
      rule.basePrice + (totalDays - rule.startDay) * rule.dailyIncrement,
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

    config.pricingRules = this.getPricingSnapshot(config).pricingRules;
    return config;
  }

  /**
   * Update or create pricing config
   */
  async updateConfig(
    businessId: string,
    input: UpdatePricingConfigInput,
  ): Promise<IPricingConfig> {
    const tier2Inc = input.day11To30Increment ?? DAY_11_TO_30_INCREMENT;
    const tier3Inc = input.day31PlusIncrement ?? DAY_31_PLUS_INCREMENT;

    let pricingRules: IPricingRule[];

    if (Array.isArray(input.pricingRules) && input.pricingRules.length > 0) {
      pricingRules = normalizePricingRules(input.pricingRules);
    } else if (Array.isArray(input.firstTenDayPrices)) {
      pricingRules = buildLegacyPricingRules(
        input.firstTenDayPrices,
        tier2Inc,
        tier3Inc,
      );
    } else {
      pricingRules = [];
    }

    validatePricingRules(pricingRules);

    let config = await PricingConfig.findOne({ businessId }).sort({
      createdAt: -1,
    });

    if (config) {
      config.pricingRules = pricingRules;
      config.firstTenDayPrices = input.firstTenDayPrices ?? undefined;
      config.day11To30Increment = Array.isArray(input.firstTenDayPrices)
        ? tier2Inc
        : undefined;
      config.day31PlusIncrement = Array.isArray(input.firstTenDayPrices)
        ? tier3Inc
        : undefined;
      config.pricePerHour = undefined;
      config.discountRules = undefined;
      await config.save();
    } else {
      config = await PricingConfig.create({
        businessId,
        pricingRules,
        firstTenDayPrices: input.firstTenDayPrices ?? undefined,
        day11To30Increment: Array.isArray(input.firstTenDayPrices)
          ? tier2Inc
          : undefined,
        day31PlusIncrement: Array.isArray(input.firstTenDayPrices)
          ? tier3Inc
          : undefined,
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
    const snapshot = this.getPricingSnapshot(config);
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
   * Return a full per-day price breakdown for N days.
   * Each entry shows what the total booking price would be for that many days.
   */
  async getPricingBreakdown(
    businessId: string,
    days: number,
  ): Promise<PricingBreakdown> {
    const config = await PricingConfig.findOne({ businessId }).sort({
      createdAt: -1,
    });

    if (!config) {
      throw new AppError(
        "Pricing config not found. Please seed the database.",
        500,
      );
    }

    const tieredConfig = this.getTieredConfig(config);
    const snapshot = this.getPricingSnapshot(config);

    const getTier = (day: number): 1 | 2 | 3 => {
      if (day <= FIRST_TEN_DAYS_COUNT) return 1;
      if (day <= 30) return 2;
      return 3;
    };

    const breakdown: PricingBreakdownEntry[] = [];
    for (let day = 1; day <= days; day++) {
      const price = this.calculateTotalPriceForDays(day, snapshot);
      breakdown.push({ day, price, tier: getTier(day) });
    }

    const totalPrice =
      breakdown.length > 0
        ? (breakdown[breakdown.length - 1]?.price ?? 0)
        : 0;

    return {
      requestedDays: days,
      totalPrice,
      breakdown,
      tieredConfig,
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
    snapshot: ResolvablePricingSnapshot,
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
