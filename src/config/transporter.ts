import nodemailer from "nodemailer";
import { BusinessEmailConfig } from "./index";

const transporterCache = new Map<string, nodemailer.Transporter>();

export const createTransporter = (
  cfg: BusinessEmailConfig,
  type: "booking" | "contact",
) => {
  const port = Number(cfg.smtpPort);

  if (!port) {
    throw new Error(`SMTP port missing for ${cfg.brandName}`);
  }

  const user = type === "booking" ? cfg.bookingSmtpUser : cfg.contactSmtpUser;
  const pass = type === "booking" ? cfg.bookingSmtpPass : cfg.contactSmtpPass;

  if (!user || !pass) {
    // Dev / unconfigured: log emails to console
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const cacheKey = `${cfg.smtpHost}:${cfg.smtpPort}:${user}:${type}`;
  const cached = transporterCache.get(cacheKey);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    // port: cfg.smtpPort,
    port,
    secure: cfg.smtpPort === 465,
    auth: { user, pass },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 60000, // 60 seconds
    socketTimeout: 120000,
    tls: {
      rejectUnauthorized: false,
    },
    // No pool — serverless environments kill idle TCP connections between invocations,
    // causing pooled connections (especially port 465 TLS) to silently fail on reuse.
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
};
