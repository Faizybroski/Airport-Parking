import nodemailer from "nodemailer";
import { BusinessEmailConfig } from "./index";

/**
 * Creates a Nodemailer transporter from a BusinessEmailConfig.
 * Called on-demand rather than once at startup so each business gets its own
 * SMTP credentials.
 */
export const createTransporter = (cfg: BusinessEmailConfig, type: "booking" | "contact") => {
  const user = type === "booking" ? cfg.bookingSmtpUser : cfg.contactSmtpUser;
  const pass = type === "booking" ? cfg.bookingSmtpPass : cfg.contactSmtpPass;

  if (!user || !pass) {
    // Dev / unconfigured: log emails to console
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: { user, pass },
  });
};
