"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const validate_1 = require("../middleware/validate");
const validators_1 = require("../validators");
const business_1 = require("../middleware/business");
const router = (0, express_1.Router)();
// GET /api/bookings/status — check if booking is enabled (public)
router.get("/status", business_1.attachBusinessId, booking_controller_1.getBookingStatus);
// GET /api/bookings/pricePerHour
router.get("/pricePerHour", business_1.attachBusinessId, booking_controller_1.getPricingConfig);
// GET /api/bookings/price
router.get("/price", business_1.attachBusinessId, booking_controller_1.calculatePrice);
// POST /api/bookings
router.post("/", business_1.attachBusinessId, (0, validate_1.validate)(validators_1.createBookingSchema), booking_controller_1.createBooking);
// GET /api/bookings/:trackingNumber
router.get("/:trackingNumber", business_1.attachBusinessId, booking_controller_1.getBookingByTracking);
exports.default = router;
//# sourceMappingURL=booking.routes.js.map