import { Request, Response, NextFunction } from "express";
import { pricingService } from "../services/pricing.service";

export const getPricingConfig = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = (_req as any).businessId;
    const config = await pricingService.getConfig(businessId);
    res.json({ success: true, data: config });
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
    const { pricePerHour, discountRules } = req.body;
    const config = await pricingService.updateConfig(
      businessId,
      pricePerHour,
      discountRules,
    );
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};
