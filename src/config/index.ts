import dotenv from "dotenv";
dotenv.config();

// ── Business IDs ────────────────────────────────────────────────────────────
export const PARKPRO_BUSINESS_ID =
  process.env.PARKPRO_BUSINESS_ID || "69c58c8616860ff720b40e4c";
export const HEATHROW_BUSINESS_ID =
  process.env.HEATHROW_BUSINESS_ID || "69d3f081f2245d52c5927d3d";

// ── Per-business email config ────────────────────────────────────────────────
export interface BusinessEmailConfig {
  smtpHost: string;
  smtpPort: number;
  bookingSmtpUser: string;
  bookingSmtpPass: string;
  bookingEmailFrom: string;
  contactSmtpUser: string;
  contactSmtpPass: string;
  contactEmail: string;
  brandName: string;
  /** Base URL of the business's frontend — used in Stripe redirect URLs. */
  frontendUrl: string;
}

const businessEmailConfigs: Record<string, BusinessEmailConfig> = {
  [PARKPRO_BUSINESS_ID]: {
    smtpHost: process.env.PARKPRO_SMTP_HOST || "premium334.web-hosting.com",
    smtpPort: parseInt(process.env.PARKPRO_SMTP_PORT || "465", 10),
    bookingSmtpUser: process.env.PARKPRO_BOOKING_SMTP_USER || "booking@parkpro.uk",
    bookingSmtpPass: process.env.PARKPRO_BOOKING_SMTP_PASS || "",
    bookingEmailFrom: process.env.PARKPRO_BOOKING_EMAIL_FROM || "booking@parkpro.uk",
    contactSmtpUser: process.env.PARKPRO_CONTACT_SMTP_USER || "info@parkpro.uk",
    contactSmtpPass: process.env.PARKPRO_CONTACT_SMTP_PASS || "",
    contactEmail: process.env.PARKPRO_CONTACT_EMAIL || "info@parkpro.uk",
    brandName: "ParkPro",
    frontendUrl: process.env.PARKPRO_FRONTEND_URL || "https://parkpro.uk",
  },
  [HEATHROW_BUSINESS_ID]: {
    smtpHost: process.env.HEATHROW_SMTP_HOST || "premium334.web-hosting.com",
    smtpPort: parseInt(process.env.HEATHROW_SMTP_PORT || "465", 10),
    bookingSmtpUser:
      process.env.HEATHROW_BOOKING_SMTP_USER || "booking@heathrowsafeparking.com",
    bookingSmtpPass: process.env.HEATHROW_BOOKING_SMTP_PASS || "",
    bookingEmailFrom:
      process.env.HEATHROW_BOOKING_EMAIL_FROM || "booking@heathrowsafeparking.com",
    contactSmtpUser:
      process.env.HEATHROW_CONTACT_SMTP_USER || "info@heathrowsafeparking.com",
    contactSmtpPass: process.env.HEATHROW_CONTACT_SMTP_PASS || "",
    contactEmail:
      process.env.HEATHROW_CONTACT_EMAIL || "info@heathrowsafeparking.com",
    brandName: "Heathrow Safe Parking",
    frontendUrl:
      process.env.HEATHROW_FRONTEND_URL || "https://heathrowsafeparking.com",
  },
};

/** Returns the email config for a given businessId, falling back to ParkPro. */
export const getBusinessEmailConfig = (businessId: string): BusinessEmailConfig => {
  return businessEmailConfigs[businessId] ?? businessEmailConfigs[PARKPRO_BUSINESS_ID];
};

// ── General config ───────────────────────────────────────────────────────────
export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/parkpro",
  jwtSecret: process.env.JWT_SECRET || "default-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  /** Comma-separated list of allowed CORS origins. */
  frontendUrls: (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};
