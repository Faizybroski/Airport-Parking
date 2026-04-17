import { Router } from "express";
import {
  getDashboard,
  getAllBookings,
  updateBookingStatus,
  exportBookings,
  deleteBooking,
  bulkDeleteBookings,
  getBookingToggle,
  setBookingToggle,
  getTerminalMessages,
  updateTerminalMessages,
} from "../controllers/admin.controller";
import {
  getPricingConfig,
  updatePricingConfig,
} from "../controllers/pricing.controller";
import {
  getAllTiers,
  getTierById,
  createTier,
  updateTier,
  deleteTier,
  assignTierToBusiness,
} from "../controllers/businessTier.controller";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { attachBusinessId } from "../middleware/business";
import {
  bookingBulkSelectionSchema,
  updateBookingStatusSchema,
  pricingConfigSchema,
  createBusinessTierSchema,
  updateBusinessTierSchema,
  assignTierSchema,
  updateTerminalMessagesSchema,
} from "../validators";

const router = Router();

// All admin routes require auth
router.use(authMiddleware);

// Dashboard
router.get("/dashboard", attachBusinessId, getDashboard);

// Bookings
router.get("/bookings", attachBusinessId, getAllBookings);
router.post(
  "/bookings/export",
  attachBusinessId,
  validate(bookingBulkSelectionSchema),
  exportBookings,
);
router.post(
  "/bookings/bulk-delete",
  attachBusinessId,
  validate(bookingBulkSelectionSchema),
  bulkDeleteBookings,
);
router.patch(
  "/bookings/:id/status",
  attachBusinessId,
  validate(updateBookingStatusSchema),
  updateBookingStatus,
);
router.delete("/bookings/:id", attachBusinessId, deleteBooking);

// Booking toggle
router.get("/booking-toggle", attachBusinessId, getBookingToggle);
router.patch("/booking-toggle", attachBusinessId, setBookingToggle);

// Terminal messages
router.get("/terminal-messages", attachBusinessId, getTerminalMessages);
router.patch("/terminal-messages", attachBusinessId, validate(updateTerminalMessagesSchema), updateTerminalMessages);

// Pricing
router.get("/pricing", attachBusinessId, getPricingConfig);
router.post(
  "/pricing",
  attachBusinessId,
  validate(pricingConfigSchema),
  updatePricingConfig,
);

// Business Tiers — specific routes before :id wildcard
router.get("/tiers", getAllTiers);
router.post("/tiers", validate(createBusinessTierSchema), createTier);
router.patch(
  "/tiers/assign",
  attachBusinessId,
  validate(assignTierSchema),
  assignTierToBusiness,
);
router.get("/tiers/:id", getTierById);
router.patch("/tiers/:id", validate(updateBusinessTierSchema), updateTier);
router.delete("/tiers/:id", deleteTier);

export default router;
