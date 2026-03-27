import { Router } from "express";
import {
  createBooking,
  getPricingConfig,
  getBookingByTracking,
  calculatePrice,
} from "../controllers/booking.controller";
import { validate } from "../middleware/validate";
import { createBookingSchema } from "../validators";
import { attachBusinessId } from "../middleware/business";

const router = Router();

// POST /api/bookings — Create a new booking
router.post(
  "/",
  attachBusinessId,
  validate(createBookingSchema),
  createBooking,
);

// GET /api/bookings/price-per-hour - Get price config
router.get("/pricePerHour", attachBusinessId, getPricingConfig);

// GET /api/bookings/price — Calculate price preview
router.get("/price", attachBusinessId, calculatePrice);

// GET /api/bookings/:trackingNumber — Track a booking
router.get("/:trackingNumber", attachBusinessId, getBookingByTracking);

export default router;
