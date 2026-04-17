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
import { compareAuthMiddleware } from "../middleware/auth";
import { compareLogin, compareLogout, getProfile } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { attachBusinessId, requireBookedVia } from "../middleware/business";
import {
  bookingBulkSelectionSchema,
  updateBookingStatusSchema,
  pricingConfigSchema,
  createBusinessTierSchema,
  updateBusinessTierSchema,
  assignTierSchema,
  adminLoginSchema,
} from "../validators";

const router = Router();
const fromCompare = requireBookedVia("heathrowcompare");

// ── Auth (no token required) ───────────────────────────────────────────────
router.post("/login", validate(adminLoginSchema), compareLogin);
router.post("/logout", compareLogout);

// ── All routes below require a valid compare_token ─────────────────────────
router.use(compareAuthMiddleware);

// Profile
router.get("/profile", getProfile);

// Dashboard — scoped to compare-originated bookings
router.get("/dashboard", attachBusinessId, fromCompare, getDashboard);

// Bookings — only compare-originated
router.get("/bookings", attachBusinessId, fromCompare, getAllBookings);
router.post(
  "/bookings/export",
  attachBusinessId,
  fromCompare,
  validate(bookingBulkSelectionSchema),
  exportBookings,
);
router.post(
  "/bookings/bulk-delete",
  attachBusinessId,
  fromCompare,
  validate(bookingBulkSelectionSchema),
  bulkDeleteBookings,
);
router.patch(
  "/bookings/:id/status",
  attachBusinessId,
  fromCompare,
  validate(updateBookingStatusSchema),
  updateBookingStatus,
);
router.delete("/bookings/:id", attachBusinessId, fromCompare, deleteBooking);

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
