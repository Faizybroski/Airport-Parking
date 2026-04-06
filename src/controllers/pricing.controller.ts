import { Request, Response, NextFunction } from "express";
import { pricingService } from "../services/pricing.service";
import { AppError } from "../middleware/errorHandler";

export const getPricingConfig = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = (_req as any).businessId;
    const config = await pricingService.getConfig(businessId);
    const tieredConfig = pricingService.getTieredConfig(config);
    res.json({ success: true, data: { ...config.toObject(), ...tieredConfig } });
  } catch (error) {
    next(error);
  }
};

export const updatePricingConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const { pricingRules, firstTenDayPrices, day11To30Increment, day31PlusIncrement } =
      req.body;
    const config = await pricingService.updateConfig(businessId, {
      pricingRules,
      firstTenDayPrices,
      day11To30Increment,
      day31PlusIncrement,
    });
    const tieredConfig = pricingService.getTieredConfig(config);
    res.json({ success: true, data: { ...config.toObject(), ...tieredConfig } });
  } catch (error) {
    next(error);
  }
};

export const getPublicPricingBreakdown = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = (req as any).businessId;
    const rawDays = req.query.days;

    if (!rawDays) {
      throw new AppError("Query parameter 'days' is required.", 400);
    }

    const days = parseInt(String(rawDays), 10);

    if (!Number.isInteger(days) || days < 1) {
      throw new AppError("'days' must be a positive integer.", 400);
    }

    if (days > 365) {
      throw new AppError("'days' cannot exceed 365.", 400);
    }

    const breakdown = await pricingService.getPricingBreakdown(businessId, days);
    res.json({ success: true, data: breakdown });
  } catch (error) {
    next(error);
  }
};
