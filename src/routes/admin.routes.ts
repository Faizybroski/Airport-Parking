import { Router } from "express";
import {
  getDashboard,
  getAllBookings,
  updateBookingStatus,
  exportBookings,
} from "../controllers/admin.controller";
import { getAllSlots, updateSlot } from "../controllers/slot.controller";
import {
  getPricingConfig,
  updatePricingConfig,
} from "../controllers/pricing.controller";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { attachBusinessId } from "../middleware/business";
import {
  updateBookingStatusSchema,
  updateSlotSchema,
  pricingConfigSchema,
} from "../validators";

const router = Router();

// All admin routes require auth
router.use(authMiddleware);

// Dashboard
router.get("/dashboard", attachBusinessId, getDashboard);

// Bookings
router.get("/bookings", attachBusinessId, getAllBookings);
router.get("/bookings/export", attachBusinessId, exportBookings);
router.patch(
  "/bookings/:id/status",
  attachBusinessId,
  validate(updateBookingStatusSchema),
  updateBookingStatus,
);

// Slots
router.get("/slots", attachBusinessId, getAllSlots);
router.patch(
  "/slots/:id",
  attachBusinessId,
  validate(updateSlotSchema),
  updateSlot,
);

// Pricing
router.get("/pricing", attachBusinessId, getPricingConfig);
router.post(
  "/pricing",
  attachBusinessId,
  validate(pricingConfigSchema),
  updatePricingConfig,
);

export default router;
