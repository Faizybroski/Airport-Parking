import dotenv from "dotenv";
import path from "path";
dotenv.config();

const REPO_ROOT = path.resolve(process.cwd(), "..");

// ── Business IDs ────────────────────────────────────────────────────────────
export const PARKPRO_BUSINESS_ID =
  process.env.PARKPRO_BUSINESS_ID || "69c58c8616860ff720b40e4c";
export const HEATHROW_BUSINESS_ID =
  process.env.HEATHROW_BUSINESS_ID || "69d3f081f2245d52c5927d3d";
export const PARKEASE_BUSINESS_ID =
  process.env.PARKEASE_BUSINESS_ID || "69e0c88358667024ac151f2e";

// ── Compare site ─────────────────────────────────────────────────────────────
export const COMPARE_SITE_NAME = "Heathrow Compare Parking";
export const COMPARE_FRONTEND_URL =
  process.env.COMPARE_FRONTEND_URL || "https://compareheathrowparking.uk";
/** Virtual business ID used only for email config routing (no DB entry). */
export const COMPARE_BUSINESS_ID = "compare";

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
  /** URL of the brand logo used in email headers. */
  logoUrl: string;
  /** Whether to show the brand name text next to the logo in emails. */
  showBrandName: boolean;
  /** Primary brand color for text, borders, and accents. */
  primaryColor: string;
  /** Primary brand color with transparency for backgrounds. */
  primaryBgColor: string;
  /** Absolute path to the brand's T&C PDF, attached to confirmation emails. */
  termsPdfPath?: string;
}

const businessEmailConfigs: Record<string, BusinessEmailConfig> = {
  [COMPARE_BUSINESS_ID]: {
    smtpHost: process.env.COMPARE_SMTP_HOST || "premium334.web-hosting.com",
    smtpPort: parseInt(process.env.COMPARE_SMTP_PORT || "465", 10),
    bookingSmtpUser:
      process.env.COMPARE_BOOKING_SMTP_USER ||
      "booking@compareheathrowparking.uk",
    bookingSmtpPass: process.env.COMPARE_BOOKING_SMTP_PASS || "",
    bookingEmailFrom:
      process.env.COMPARE_BOOKING_EMAIL_FROM ||
      "booking@compareheathrowparking.uk",
    contactSmtpUser:
      process.env.COMPARE_CONTACT_SMTP_USER || "info@compareheathrowparking.uk",
    contactSmtpPass: process.env.COMPARE_CONTACT_SMTP_PASS || "",
    contactEmail:
      process.env.COMPARE_CONTACT_EMAIL || "info@compareheathrowparking.uk",
    brandName: COMPARE_SITE_NAME,
    frontendUrl:
      process.env.COMPARE_FRONTEND_URL || "https://compareheathrowparking.uk",
    logoUrl: "https://compareheathrowparking.uk/logo.svg",
    showBrandName: true,
    primaryColor: "#7c3aed",
    primaryBgColor: "#ede9fe",
  },
  [PARKEASE_BUSINESS_ID]: {
    smtpHost: process.env.PARKEASE_SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(process.env.PARKEASE_SMTP_PORT || "587", 10),
    bookingSmtpUser:
      process.env.PARKEASE_BOOKING_SMTP_USER || "parkeaseparking@gmail.com",
    bookingSmtpPass: process.env.PARKEASE_BOOKING_SMTP_PASS || "",
    bookingEmailFrom:
      process.env.PARKEASE_BOOKING_EMAIL_FROM || "parkeaseparking@gmail.com",
    contactSmtpUser:
      process.env.PARKEASE_CONTACT_SMTP_USER || "parkeaseparking@gmail.com",
    contactSmtpPass: process.env.PARKEASE_CONTACT_SMTP_PASS || "",
    contactEmail:
      process.env.PARKEASE_CONTACT_EMAIL || "parkeaseparking@gmail.com",
    brandName: "ParkEase",
    frontendUrl:
      process.env.PARKEASE_FRONTEND_URL || "https://park-ease-eta.vercel.app",
    logoUrl: "https://park-ease-eta.vercel.app/logo.svg",
    showBrandName: false,
    primaryColor: "#216269",
    primaryBgColor: "#39a9b5",
    termsPdfPath:
      "https://park-ease-eta.vercel.app/TERMS-AND-CONDITIONS-PARKEASE-PARKING-LIMITED.pdf",
  },
  [PARKPRO_BUSINESS_ID]: {
    smtpHost: process.env.PARKPRO_SMTP_HOST || "premium334.web-hosting.com",
    smtpPort: parseInt(process.env.PARKPRO_SMTP_PORT || "465", 10),
    bookingSmtpUser:
      process.env.PARKPRO_BOOKING_SMTP_USER || "booking@parkpro.uk",
    bookingSmtpPass: process.env.PARKPRO_BOOKING_SMTP_PASS || "",
    bookingEmailFrom:
      process.env.PARKPRO_BOOKING_EMAIL_FROM || "booking@parkpro.uk",
    contactSmtpUser: process.env.PARKPRO_CONTACT_SMTP_USER || "info@parkpro.uk",
    contactSmtpPass: process.env.PARKPRO_CONTACT_SMTP_PASS || "",
    contactEmail: process.env.PARKPRO_CONTACT_EMAIL || "info@parkpro.uk",
    brandName: "ParkPro",
    frontendUrl: process.env.PARKPRO_FRONTEND_URL || "https://parkpro.uk",
    logoUrl: "https://parkpro.uk/logo.svg",
    showBrandName: true,
    primaryColor: "#fe6f09",
    primaryBgColor: "#ff8b338f",
    termsPdfPath:
      "https://parkpro.uk/TERMS-AND-CONDITIONS-PARKPRO-PARKING-LIMITED.pdf",
  },
  [HEATHROW_BUSINESS_ID]: {
    smtpHost: process.env.HEATHROW_SMTP_HOST || "premium334.web-hosting.com",
    smtpPort: parseInt(process.env.HEATHROW_SMTP_PORT || "465", 10),
    bookingSmtpUser:
      process.env.HEATHROW_BOOKING_SMTP_USER ||
      "booking@heathrowsafeparking.com",
    bookingSmtpPass: process.env.HEATHROW_BOOKING_SMTP_PASS || "",
    bookingEmailFrom:
      process.env.HEATHROW_BOOKING_EMAIL_FROM ||
      "booking@heathrowsafeparking.com",
    contactSmtpUser:
      process.env.HEATHROW_CONTACT_SMTP_USER || "info@heathrowsafeparking.com",
    contactSmtpPass: process.env.HEATHROW_CONTACT_SMTP_PASS || "",
    contactEmail:
      process.env.HEATHROW_CONTACT_EMAIL || "info@heathrowsafeparking.com",
    brandName: "Heathrow Safe Parking",
    frontendUrl:
      process.env.HEATHROW_FRONTEND_URL || "https://heathrowsafeparking.com",
    logoUrl: "https://heathrowsafeparking.com/logo.svg",
    showBrandName: false,
    primaryColor: "#21aeca",
    primaryBgColor: "#21aeca7a",
    termsPdfPath:
      "https://heathrowsafeparking.com/TERMS-AND-CONDITIONS-HEATHROW-SAFE-PARKING-LIMITED.pdf",
  },
};

/** Returns the email config for a given businessId, falling back to ParkPro. */
export const getBusinessEmailConfig = (
  businessId: string,
): BusinessEmailConfig => {
  return (
    businessEmailConfigs[businessId] ??
    businessEmailConfigs[PARKPRO_BUSINESS_ID]
  );
};

/** Returns the compare site email config (always — no fallback needed). */
export const getCompareEmailConfig = (): BusinessEmailConfig =>
  businessEmailConfigs[COMPARE_BUSINESS_ID];

/** Returns all business email configs (used for pre-warming at startup). */
export const getAllBusinessEmailConfigs = (): BusinessEmailConfig[] =>
  Object.values(businessEmailConfigs);

// ── General config ───────────────────────────────────────────────────────────
export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/parkpro",
  jwtSecret: process.env.JWT_SECRET || "default-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  /** Comma-separated list of allowed CORS origins. */
  frontendUrls: (
    process.env.FRONTEND_URL ||
    "http://localhost:3000,http://localhost:3002,https://compareheathrowparking.uk,https://www.compareheathrowparking.com,https://parkpro.uk,https://www.parkpro.uk,https://park-ease-eta.vercel.app,https://heathrowsafeparking.com,https://www.heathrowsafeparking.com"
  )
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};
