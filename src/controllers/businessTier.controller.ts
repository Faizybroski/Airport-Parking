import { Request, Response, NextFunction } from "express";
import { BusinessTier } from "../models/BusinessTier";
import { Business } from "../models/Business";
import { AppError } from "../middleware/errorHandler";

/**
 * GET /api/admin/tiers
 * Returns all business tiers.
 */
export const getAllTiers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tiers = await BusinessTier.find().sort({ createdAt: 1 });
    res.json({ success: true, data: tiers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tiers/:id
 * Returns a single business tier.
 */
export const getTierById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tier = await BusinessTier.findById(req.params.id);
    if (!tier) {
      throw new AppError("Tier not found.", 404);
    }
    res.json({ success: true, data: tier });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tiers
 * Creates a new business tier.
 */
export const createTier = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      description,
      features,
      firstTenDayPrices,
      day11To30Increment,
      day31PlusIncrement,
      isActive,
    } = req.body;

    const existing = await BusinessTier.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      throw new AppError(`A tier named "${name}" already exists.`, 409);
    }

    const tier = await BusinessTier.create({
      name: name.trim(),
      description: description ?? "",
      features,
      firstTenDayPrices,
      day11To30Increment,
      day31PlusIncrement,
      isActive: isActive ?? true,
    });

    res.status(201).json({ success: true, data: tier });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/tiers/:id
 * Updates an existing business tier.
 */
export const updateTier = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tier = await BusinessTier.findById(req.params.id);
    if (!tier) {
      throw new AppError("Tier not found.", 404);
    }

    const {
      name,
      description,
      features,
      firstTenDayPrices,
      day11To30Increment,
      day31PlusIncrement,
      isActive,
    } = req.body;

    if (name !== undefined && name.trim() !== tier.name) {
      const conflict = await BusinessTier.findOne({
        _id: { $ne: tier._id },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      });
      if (conflict) {
        throw new AppError(`A tier named "${name}" already exists.`, 409);
      }
      tier.name = name.trim();
    }

    if (description !== undefined) tier.description = description;
    if (features !== undefined) tier.features = features;
    if (firstTenDayPrices !== undefined) tier.firstTenDayPrices = firstTenDayPrices;
    if (day11To30Increment !== undefined) tier.day11To30Increment = day11To30Increment;
    if (day31PlusIncrement !== undefined) tier.day31PlusIncrement = day31PlusIncrement;
    if (isActive !== undefined) tier.isActive = isActive;

    await tier.save();
    res.json({ success: true, data: tier });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/tiers/:id
 * Deletes a business tier. Refuses if any business is still assigned to it.
 */
export const deleteTier = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tier = await BusinessTier.findById(req.params.id);
    if (!tier) {
      throw new AppError("Tier not found.", 404);
    }

    const assignedCount = await Business.countDocuments({ tierId: tier._id });
    if (assignedCount > 0) {
      throw new AppError(
        `Cannot delete tier: ${assignedCount} business(es) are still assigned to it.`,
        409,
      );
    }

    await tier.deleteOne();
    res.json({ success: true, message: "Tier deleted." });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/tiers/:id/assign
 * Assigns or removes a tier from the current business.
 * Body: { tierId: string | null }
 */
export const assignTierToBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;
    const { tierId } = req.body as { tierId: string | null };

    if (tierId !== null) {
      const tier = await BusinessTier.findById(tierId);
      if (!tier) {
        throw new AppError("Tier not found.", 404);
      }
      if (!tier.isActive) {
        throw new AppError("Cannot assign an inactive tier.", 400);
      }
    }

    const business = await Business.findByIdAndUpdate(
      businessId,
      { tierId: tierId ?? null },
      { new: true },
    ).populate("tierId");

    if (!business) {
      throw new AppError("Business not found.", 404);
    }

    res.json({ success: true, data: business });
  } catch (error) {
    next(error);
  }
};
