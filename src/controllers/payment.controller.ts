import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { config } from "../config";
import { bookingService } from "../services/booking.service";
import { pricingService } from "../services/pricing.service";
import { Business } from "../models/Business";
import AppError from "../utils/AppError";
import { createBookingSchema } from "../validators";

const stripe = new Stripe(config.stripeSecretKey);

/**
 * POST /api/payments/create-checkout-session
 * Creates a booking (awaiting_payment) + a Stripe Checkout session.
 * Returns { checkoutUrl, trackingNumber }
 */
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.businessId!;

    // Validate input using the same schema as createBooking
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const data = parsed.data;

    // Check business exists and bookings are enabled
    const business = await Business.findById(businessId);
    if (!business) return next(new AppError("Business not found", 404));
    if (business.bookingEnabled === false) {
      return next(
        new AppError(
          "Bookings are currently disabled. Please try again later.",
          403,
        ),
      );
    }

    // Calculate price server-side (never trust client-supplied price)
    const priceCalc = await pricingService.calculatePrice(
      businessId,
      new Date(data.bookedStartTime),
      new Date(data.bookedEndTime),
    );

    // Create the booking record with paymentStatus: 'awaiting_payment'
    const booking = await bookingService.createBooking(businessId, data);

    // Build a human-readable description for the Stripe line item
    const dropOff = new Date(data.bookedStartTime).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const pickUp = new Date(data.bookedEndTime).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create Stripe Checkout session (card only, GBP)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(priceCalc.finalPrice * 100), // pence
            product_data: {
              name: `Airport Parking — ${booking.carMake} ${booking.carModel}`,
              description: `Drop-off: ${dropOff} | Pick-up: ${pickUp} | Reg: ${booking.carNumber}`,
            },
          },
        },
      ],
      customer_email: booking.userEmail,
      success_url: `${config.frontendUrl}/book/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/book/payment-cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30-minute window
      metadata: {
        bookingId: (booking._id as unknown as string).toString(),
        trackingNumber: booking.trackingNumber,
        businessId,
      },
    });

    // Store the session ID on the booking so the webhook can find it
    await bookingService.attachStripeSession(
      (booking._id as unknown as string).toString(),
      session.id,
    );

    res.status(201).json({
      success: true,
      data: {
        checkoutUrl: session.url,
        trackingNumber: booking.trackingNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/webhook
 * Stripe sends signed events here.
 * Requires raw (un-parsed) body — registered in server.ts before express.json().
 */
export const stripeWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const sig = Array.isArray(req.headers["stripe-signature"])
    ? req.headers["stripe-signature"][0]
    : req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      config.stripeWebhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          const booking = await bookingService.confirmPayment(session.id);
          if (booking) {
            console.log(
              `Payment confirmed for booking ${booking.trackingNumber}`,
            );
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await bookingService.cancelPendingBooking(session.id);
        console.log(
          `Checkout session expired, booking cancelled: ${session.id}`,
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Error processing Stripe webhook event:", err);
    res.status(500).json({ error: "Webhook handler failed" });
    return;
  }

  res.json({ received: true });
};

/**
 * GET /api/payments/session/:sessionId
 * Fetches booking details by Stripe session ID (used by the success page).
 */
export const getBookingBySession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessionId = String(req.params.sessionId);
    const booking = await bookingService.getBySessionId(sessionId);

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await bookingService.confirmPayment(session.id);
    }

    // Only return paid bookings to prevent enumeration of pending ones
    if (booking.paymentStatus !== "paid") {
      return next(new AppError("Payment not yet confirmed", 402));
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};
