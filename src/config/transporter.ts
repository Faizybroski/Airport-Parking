import nodemailer from "nodemailer";

export const contactTransporter = nodemailer.createTransport({
  host: process.env.CONTACT_SMTP_HOST,
  port: Number(process.env.CONTACT_SMTP_PORT),
  secure: true, // 465
  auth: {
    user: process.env.CONTACT_SMTP_USER,
    pass: process.env.CONTACT_SMTP_PASS,
  },
});

export const bookingTransporter = nodemailer.createTransport({
  host: process.env.BOOKING_SMTP_HOST,
  port: Number(process.env.BOOKING_SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.BOOKING_SMTP_USER,
    pass: process.env.BOOKING_SMTP_PASS,
  },
});
