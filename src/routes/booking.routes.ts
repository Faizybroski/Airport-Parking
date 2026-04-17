import { Router } from "express";
import {
  createBooking,
  getPricingConfig,
  getBookingByTracking,
  calculatePrice,
  getBookingStatus,
  getActiveTiers,
} from "../controllers/booking.controller";
import { getPublicPricingBreakdown } from "../controllers/pricing.controller";
import { validate } from "../middleware/validate";
import { createBookingSchema } from "../validators";
import { attachBusinessId } from "../middleware/business";

const router = Router();

// GET /api/bookings/status — check if booking is enabled (public)
router.get("/status", attachBusinessId, getBookingStatus);

// GET /api/bookings/tiers — public list of active service tiers
router.get("/tiers", getActiveTiers);

// GET /api/bookings/pricePerHour
router.get("/pricePerHour", attachBusinessId, getPricingConfig);

// GET /api/bookings/price
router.get("/price", attachBusinessId, calculatePrice);

// GET /api/bookings/pricing?days=N — public per-day price breakdown
router.get("/pricing", attachBusinessId, getPublicPricingBreakdown);

// POST /api/bookings
router.post("/", attachBusinessId, validate(createBookingSchema), createBooking);

// GET /api/bookings/:trackingNumber
router.get("/:trackingNumber", attachBusinessId, getBookingByTracking);

export default router;
