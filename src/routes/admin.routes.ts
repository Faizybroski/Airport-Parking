import { Router } from "express";
import {
  getDashboard,
  getAllBookings,
  updateBookingStatus,
  exportBookings,
  getBookingToggle,
  setBookingToggle,
} from "../controllers/admin.controller";
import {
  getPricingConfig,
  updatePricingConfig,
} from "../controllers/pricing.controller";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { attachBusinessId } from "../middleware/business";
import {
  updateBookingStatusSchema,
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

// Booking toggle
router.get("/booking-toggle", attachBusinessId, getBookingToggle);
router.patch("/booking-toggle", attachBusinessId, setBookingToggle);

// Pricing
router.get("/pricing", attachBusinessId, getPricingConfig);
router.post(
  "/pricing",
  attachBusinessId,
  validate(pricingConfigSchema),
  updatePricingConfig,
);

export default router;
