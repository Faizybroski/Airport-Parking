import { Router, Request, Response, NextFunction } from "express";
import {
  createCheckoutSession,
  stripeWebhook,
  getBookingBySession,
} from "../controllers/payment.controller";
import { attachBusinessId } from "../middleware/business";

const router = Router();

/**
 * POST /api/payments/webhook
 * Must use raw body — registered with express.raw() in server.ts BEFORE express.json().
 */
// router.post("/webhook", stripeWebhook);

/**
 * POST /api/payments/create-checkout-session
 * Creates a Stripe Checkout session from the booking form data.
 */
router.post("/create-checkout-session", attachBusinessId, createCheckoutSession);

/**
 * GET /api/payments/session/:sessionId
 * Returns the confirmed booking for a given Stripe session ID.
 */
router.get("/session/:sessionId", getBookingBySession);

export default router;
