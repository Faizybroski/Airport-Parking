"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || "5000", 10),
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/parkpro",
    jwtSecret: process.env.JWT_SECRET || "default-secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    bookingSmtp: {
        host: process.env.BOOKING_SMTP_HOST || "premium334.web-hosting.com",
        port: parseInt(process.env.BOOKING_SMTP_PORT || "465", 10),
        user: process.env.BOOKING_SMTP_USER || "Park Pro",
        pass: process.env.BOOKING_SMTP_PASS || "",
    },
    contactSmtp: {
        host: process.env.CONTACT_SMTP_HOST || "premium334.web-hosting.com",
        port: parseInt(process.env.CONTACT_SMTP_PORT || "465", 10),
        user: process.env.CONTACT_SMTP_USER || "Park Pro",
        pass: process.env.CONTACT_SMTP_PASS || "",
    },
    contactEmail: process.env.CONTACT_EMAIL || "info@parkpro.uk",
    bookingEmailFrom: process.env.BOOKING_EMAIL_FROM || "booking@parkpro.uk",
    emailFromName: process.env.CONTACT_EMAIL_FROM_NAME || "ParkPro Parking",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};
//# sourceMappingURL=index.js.map