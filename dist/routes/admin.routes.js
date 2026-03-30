"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const pricing_controller_1 = require("../controllers/pricing.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const business_1 = require("../middleware/business");
const validators_1 = require("../validators");
const router = (0, express_1.Router)();
// All admin routes require auth
router.use(auth_1.authMiddleware);
// Dashboard
router.get("/dashboard", business_1.attachBusinessId, admin_controller_1.getDashboard);
// Bookings
router.get("/bookings", business_1.attachBusinessId, admin_controller_1.getAllBookings);
router.get("/bookings/export", business_1.attachBusinessId, admin_controller_1.exportBookings);
router.patch("/bookings/:id/status", business_1.attachBusinessId, (0, validate_1.validate)(validators_1.updateBookingStatusSchema), admin_controller_1.updateBookingStatus);
// Booking toggle
router.get("/booking-toggle", business_1.attachBusinessId, admin_controller_1.getBookingToggle);
router.patch("/booking-toggle", business_1.attachBusinessId, admin_controller_1.setBookingToggle);
// Pricing
router.get("/pricing", business_1.attachBusinessId, pricing_controller_1.getPricingConfig);
router.post("/pricing", business_1.attachBusinessId, (0, validate_1.validate)(validators_1.pricingConfigSchema), pricing_controller_1.updatePricingConfig);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map