import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { connectDB } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import bookingRoutes from "./routes/booking.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import compareAdminRoutes from "./routes/compareAdmin.routes";
import paymentRoutes from "./routes/payment.routes";
import contactRoutes from "./routes/contact.routes";
import { stripeWebhook } from "./controllers/payment.controller";
import { emailService } from "./services/email.service";

const app = express();

// Middleware

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (config.frontendUrls.includes(origin)) {
        return callback(null, true);
      }
      // Return false (not an Error) so cors sends a proper 403, not a 500
      console.warn(`CORS blocked: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-business-id"],
  }),
);
app.use(morgan("dev"));

// Stripe webhook needs the raw body — must be registered BEFORE express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", contactRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/compare", compareAdminRoutes);
// Health check
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "ParkPro API is running" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`\n🚀 Heathrow Parking Services API running on http://localhost:${config.port}`);
    console.log(
      `📊 Health check: http://localhost:${config.port}/api/health\n`,
    );
  });
  // Pre-warm SMTP connections and cache PDFs — runs in background, doesn't block startup
  emailService.warmup().catch(console.error);
};

startServer().catch(console.error);

export default app;
