import { IBooking } from "../models/Booking";
import { getBusinessEmailConfig } from "../config";
import { createTransporter } from "../config/transporter";
import {
  calculateChargeableDays,
  formatDayCount,
  formatDuration,
  formatPrice,
} from "../utils/helpers";

class EmailService {
  async sendBookingConfirmation(booking: IBooking): Promise<void> {
    const businessId = booking.businessId.toString();
    const cfg = getBusinessEmailConfig(businessId);
    const transporter = createTransporter(cfg, "booking");
    const isConfigured = !!(cfg.bookingSmtpUser && cfg.bookingSmtpPass);

    const startDate = new Date(booking.bookedStartTime).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const endDate = new Date(booking.bookedEndTime).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const totalHours =
      (booking.bookedEndTime.getTime() - booking.bookedStartTime.getTime()) /
      (1000 * 60 * 60);
    const duration = formatDuration(totalHours);
    const bookedDays =
      booking.bookedDays ??
      calculateChargeableDays(booking.bookedStartTime, booking.bookedEndTime);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: #ff8b338f; color: #fff; padding: 32px 24px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px;}
            .header .brand { font-weight: bold; font-size: 28px; color: #fff; }
            .body-content { padding: 32px 24px; }
            .tracking-box { background: #ff8b338f; border: 2px dashed #fe6f09; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
            .tracking-box .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .tracking-box .number { font-size: 28px; font-weight: bold; color: #fe6f09; margin: 4px 0; letter-spacing: 2px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row .label { color: #666; font-size: 14px; }
            .detail-row .value { font-weight: 600; color: #333; font-size: 14px; }
            .section-title { font-size: 16px; font-weight: 600; color: #fe6f09; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e8f0fe; }
            .price-box { background: #e8f4e8; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
            .price-box .amount { font-size: 32px; font-weight: bold; color: #2a7d2a; }
            .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; font-size: 12px; color: #999; }
            table { width: 100%; }
            td { padding: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <p class="brand">${cfg.brandName.toUpperCase()}</p>
            </div>
            <div class="body-content">
              <p>Dear <strong>${booking.userName}</strong>,</p>
              <p>Your parking has been booked successfully! Here are your booking details:</p>

              <div class="tracking-box">
                <div class="label">Your Tracking Number</div>
                <div class="number">${booking.trackingNumber}</div>
                <div style="font-size: 12px; color: #888;">Use this to track your booking anytime</div>
              </div>

              <div class="section-title">📍 Parking Details</div>
              <table>
                <tr class="detail-row">
                  <td class="label">Drop-off</td>
                  <td class="value">${startDate}</td>
                </tr>
                <tr class="detail-row">
                  <td class="label">Pick-up</td>
                  <td class="value">${endDate}</td>
                </tr>
                <tr class="detail-row">
                  <td class="label">Duration</td>
                  <td class="value">${duration}</td>
                </tr>
                <tr class="detail-row">
                  <td class="label">Booked Days</td>
                  <td class="value">${formatDayCount(bookedDays)}</td>
                </tr>
              </table>

              <div class="section-title">🚗 Vehicle Details</div>
              <table>
                <tr class="detail-row">
                  <td class="label">Vehicle</td>
                  <td class="value">${booking.carMake} ${booking.carModel}</td>
                </tr>
                <tr class="detail-row">
                  <td class="label">Registration</td>
                  <td class="value">${booking.carNumber}</td>
                </tr>
                <tr class="detail-row">
                  <td class="label">Colour</td>
                  <td class="value">${booking.carColor}</td>
                </tr>
              </table>

              ${
                booking.departureFlightNo
                  ? `
              <div class="section-title">✈️ Flight Details</div>
              <table>
                ${booking.departureTerminal ? `<tr class="detail-row"><td class="label">Departure Terminal</td><td class="value">${booking.departureTerminal}</td></tr>` : ""}
                ${booking.departureFlightNo ? `<tr class="detail-row"><td class="label">Departure Flight</td><td class="value">${booking.departureFlightNo}</td></tr>` : ""}
                ${booking.arrivalTerminal ? `<tr class="detail-row"><td class="label">Arrival Terminal</td><td class="value">${booking.arrivalTerminal}</td></tr>` : ""}
                ${booking.arrivalFlightNo ? `<tr class="detail-row"><td class="label">Arrival Flight</td><td class="value">${booking.arrivalFlightNo}</td></tr>` : ""}
              </table>
              `
                  : ""
              }

              <div class="price-box">
                <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Total Price</div>
                <div class="amount">${formatPrice(booking.totalPrice)}</div>
                ${booking.discountPercent > 0 ? `<div style="font-size: 13px; color: #2a7d2a;">✅ ${booking.discountPercent}% discount applied</div>` : ""}
              </div>

              <p style="font-size: 14px; color: #666;">If you have any questions, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${cfg.brandName}. All rights reserved.</p>
              <p>This is an automated confirmation. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: `"${cfg.brandName}" <${cfg.bookingEmailFrom}>`,
      to: booking.userEmail,
      subject: `Booking Confirmed - ${booking.trackingNumber} | ${cfg.brandName}`,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      if (!isConfigured) {
        console.log("📧 Email (dev mode):", JSON.parse((info as any).message).subject);
      } else {
        console.log("📧 Email sent:", (info as any).messageId);
      }
    } catch (error) {
      console.error("❌ Email send failed:", error);
      // Don't throw — email failure shouldn't break the booking
    }
  }
}

export const emailService = new EmailService();
