import nodemailer from "nodemailer";
import { BusinessEmailConfig } from "./index";

const transporterCache = new Map<string, nodemailer.Transporter>();

export const createTransporter = (cfg: BusinessEmailConfig, type: "booking" | "contact") => {
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
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
};
