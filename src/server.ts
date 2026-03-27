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

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-business-id"],
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/admin", adminRoutes);

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
    console.log(`\n🚀 ParkPro API running on http://localhost:${config.port}`);
    console.log(
      `📊 Health check: http://localhost:${config.port}/api/health\n`,
    );
  });
};

startServer().catch(console.error);

export default app;
