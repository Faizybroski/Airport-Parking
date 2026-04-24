import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import { IBooking } from "../models/Booking";
import { Business } from "../models/Business";
import {
  getBusinessEmailConfig,
  getCompareEmailConfig,
  getAllBusinessEmailConfigs,
  COMPARE_SITE_NAME,
} from "../config";
import { createTransporter } from "../config/transporter";
import {
  calculateChargeableDays,
  formatDayCount,
  formatDuration,
  formatPrice,
} from "../utils/helpers";

// Pre-fetched PDF buffers keyed by URL — populated once at startup
const pdfBufferCache = new Map<string, { filename: string; content: Buffer }>();

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

class EmailService {
  /** Call once at server startup to open SMTP connections and cache PDFs. */
  async warmup(): Promise<void> {
    const configs = getAllBusinessEmailConfigs();

    // Pre-fetch all PDF URLs in parallel
    await Promise.allSettled(
      configs
        .filter((cfg) => cfg.termsPdfPath?.startsWith("http"))
        .map(async (cfg) => {
          const url = cfg.termsPdfPath!;
          if (pdfBufferCache.has(url)) return;
          try {
            const content = await fetchBuffer(url);
            pdfBufferCache.set(url, { filename: path.basename(url), content });
            console.log(`📎 PDF cached: ${path.basename(url)}`);
          } catch (err) {
            console.warn(
              `⚠️  Could not pre-fetch PDF ${url}:`,
              (err as Error).message,
            );
          }
        }),
    );

    // Pre-warm SMTP connection pools for all configured businesses
    const seen = new Set<string>();
    await Promise.allSettled(
      configs.map(async (cfg) => {
        const key = `${cfg.smtpHost}:${cfg.smtpPort}:${cfg.bookingSmtpUser}`;
        if (!cfg.bookingSmtpUser || !cfg.bookingSmtpPass || seen.has(key))
          return;
        seen.add(key);
        try {
          const t = createTransporter(cfg, "booking");
          await t.verify();
          console.log(`✅ SMTP ready: ${cfg.smtpHost} (${cfg.brandName})`);
        } catch (err) {
          console.warn(
            `⚠️  SMTP verify failed for ${cfg.brandName}:`,
            (err as Error).message,
          );
        }
      }),
    );
  }

  async sendBookingConfirmation(booking: IBooking): Promise<void> {
    const businessId = booking.businessId.toString();
    // Brand config drives the template (logo, colours, brand name).
    const cfg = getBusinessEmailConfig(businessId);
    // When booked via the compare site, use compare SMTP credentials.
    const isCompareSite = booking.bookedVia === "heathrowcompare";
    const smtpCfg = isCompareSite ? getCompareEmailConfig() : cfg;
    const transporter = createTransporter(smtpCfg, "booking");
    const isConfigured = !!(smtpCfg.bookingSmtpUser && smtpCfg.bookingSmtpPass);

    const startDate = new Date(booking.bookedStartTime).toLocaleString(
      "en-GB",
      {
        dateStyle: "full",
        timeStyle: "short",
      },
    );
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

    // Look up any admin-configured message for the selected departure terminal
    const business = await Business.findById(businessId).lean();
    const terminalMessage =
      booking.departureTerminal && booking.departureTerminal !== ""
        ? ((business?.terminalMessages as Record<string, string> | undefined)?.[
            booking.departureTerminal
          ] ?? "")
        : "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: ${cfg.primaryBgColor}; color: #fff; padding: 32px 24px; text-align: center; }
            .header-inner { display: inline-flex; align-items: center; justify-content: center; gap: 12px; }
            .header img { height: 48px; width: auto; display: block; }
            .header .brand { font-weight: bold; font-size: 28px; color: #fff; }
            .compare-banner { background: #1a1a2e; color: #fff; padding: 8px 16px; text-align: center; font-size: 12px; letter-spacing: 0.5px; }
            .compare-banner strong { color: #a78bfa; }
            .body-content { padding: 32px 24px; }
            .provider-note { background: #f3f0ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #4b4b6b; }
            .provider-note strong { color: #7c3aed; }
            .tracking-box { background: ${cfg.primaryBgColor}; border: 2px dashed ${cfg.primaryColor}; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
            .tracking-box .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .tracking-box .number { font-size: 28px; font-weight: bold; color: ${cfg.primaryColor}; margin: 4px 0; letter-spacing: 2px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row .label { color: #666; font-size: 14px; }
            .detail-row .value { font-weight: 600; color: #333; font-size: 14px; }
            .section-title { font-size: 16px; font-weight: 600; color: ${cfg.primaryColor}; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e8f0fe; }
            .price-box { background: #e8f4e8; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
            .price-box .amount { font-size: 32px; font-weight: bold; color: #2a7d2a; }
            .terminal-message { background: #fff8e1; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 16px 0; }
            .terminal-message strong { color: #92400e; display: block; margin-bottom: 6px; font-size: 14px; }
            .terminal-message p { margin: 0; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
            .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; font-size: 12px; color: #999; }
            table { width: 100%; }
            td { padding: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${isCompareSite ? `<div class="compare-banner">Booked via <strong>${COMPARE_SITE_NAME}</strong></div>` : ""}
            <div class="header">
              <div class="header-inner">
                <img src="${cfg.logoUrl}" alt="${cfg.brandName} logo" />
                ${cfg.showBrandName ? `<span class="brand">${cfg.brandName.toUpperCase()}</span>` : ""}
              </div>
            </div>
            <div class="body-content">
              <p>Dear <strong>${booking.userName}</strong>,</p>
              ${
                isCompareSite
                  ? `<p>Your parking has been booked successfully through <strong>${COMPARE_SITE_NAME}</strong>. Your parking services are provided by <strong>${cfg.brandName}</strong>. Here are your booking details:</p>
                   <div class="provider-note">Parking services provided by <strong>${cfg.brandName}</strong> — booked via <strong>${COMPARE_SITE_NAME}</strong>.</div>`
                  : `<p>Your parking has been booked successfully! Here are your booking details:</p>`
              }

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
                booking.departureTerminal ||
                booking.departureFlightNo ||
                booking.arrivalTerminal ||
                booking.arrivalFlightNo
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

<div class="terminal-message">
  <strong>
    Please ensure you contact our team on +44 7903 835808 at least 30 minutes prior to your arrival at the airport, so we can coordinate your booking and provide a smooth, timely service.
  </strong>
</div>

${
  (booking.departureTerminal ||
    booking.departureFlightNo ||
    booking.arrivalTerminal ||
    booking.arrivalFlightNo) &&
  terminalMessage
    ? `
    <div class="terminal-message">
      <strong>📍 ${booking.departureTerminal || "Terminal"} — Important Information</strong>
      <p>${terminalMessage}</p>
    </div>
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
              ${isCompareSite ? `<p>Booking made via <strong>${COMPARE_SITE_NAME}</strong>. Parking services provided by ${cfg.brandName}.</p>` : ""}
              <p>This is an automated confirmation. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const compareHTML = `
    <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: ${cfg.primaryBgColor}; color: #fff; padding: 32px 24px; text-align: center; }
            .header-inner { display: inline-flex; align-items: center; justify-content: center; gap: 12px; }
            .header img { height: 48px; width: auto; display: block; }
            .header .brand { font-weight: bold; font-size: 28px; color: #fff; }
            .compare-banner { background: #1a1a2e; color: #fff; padding: 8px 16px; text-align: center; font-size: 12px; letter-spacing: 0.5px; }
            .compare-banner strong { color: #a78bfa; }
            .body-content { padding: 32px 24px; }
            .provider-note { background: #f3f0ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #4b4b6b; }
            .provider-note strong { color: #7c3aed; }
            .tracking-box { background: ${cfg.primaryBgColor}; border: 2px dashed ${cfg.primaryColor}; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
            .tracking-box .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .tracking-box .number { font-size: 28px; font-weight: bold; color: ${cfg.primaryColor}; margin: 4px 0; letter-spacing: 2px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row .label { color: #666; font-size: 14px; }
            .detail-row .value { font-weight: 600; color: #333; font-size: 14px; }
            .section-title { font-size: 16px; font-weight: 600; color: ${cfg.primaryColor}; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e8f0fe; }
            .price-box { background: #e8f4e8; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
            .price-box .amount { font-size: 32px; font-weight: bold; color: #2a7d2a; }
            .terminal-message { background: #fff8e1; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 16px 0; }
            .terminal-message strong { color: #92400e; display: block; margin-bottom: 6px; font-size: 14px; }
            .terminal-message p { margin: 0; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
            .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; font-size: 12px; color: #999; }
            table { width: 100%; }
            td { padding: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="body-content">
              <p>Customer <strong>${booking.userName}</strong>,</p>
              <div class="tracking-box">
                <div class="label">Your Tracking Number</div>
                <div class="number">${booking.trackingNumber}</div>
              </div>
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
                booking.departureTerminal ||
                booking.departureFlightNo ||
                booking.arrivalTerminal ||
                booking.arrivalFlightNo
                  ? `
              <table>
                ${booking.departureTerminal ? `<tr class="detail-row"><td class="label">Departure Terminal</td><td class="value">${booking.departureTerminal}</td></tr>` : ""}
                ${booking.departureFlightNo ? `<tr class="detail-row"><td class="label">Departure Flight</td><td class="value">${booking.departureFlightNo}</td></tr>` : ""}
                ${booking.arrivalTerminal ? `<tr class="detail-row"><td class="label">Arrival Terminal</td><td class="value">${booking.arrivalTerminal}</td></tr>` : ""}
                ${booking.arrivalFlightNo ? `<tr class="detail-row"><td class="label">Arrival Flight</td><td class="value">${booking.arrivalFlightNo}</td></tr>` : ""}
              </table>`
                  : ""
              }
             
              <div class="price-box">
                <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Total Price</div>
                <div class="amount">${formatPrice(booking.totalPrice)}</div>
                ${booking.discountPercent > 0 ? `<div style="font-size: 13px; color: #2a7d2a;">✅ ${booking.discountPercent}% discount applied</div>` : ""}
              </div>

              </div>
          </div>
        </body>
      </html>
    `;

    const senderName = isCompareSite
      ? `${COMPARE_SITE_NAME} (${cfg.brandName})`
      : cfg.brandName;
    const senderEmail = isCompareSite
      ? smtpCfg.bookingEmailFrom
      : cfg.bookingEmailFrom;
    const subjectSuffix = isCompareSite
      ? `${COMPARE_SITE_NAME} — ${cfg.brandName}`
      : cfg.brandName;

    const attachments: {
      filename: string;
      content?: Buffer;
      path?: string;
      href?: string;
    }[] = [];
    if (cfg.termsPdfPath) {
      const isUrl =
        cfg.termsPdfPath.startsWith("http://") ||
        cfg.termsPdfPath.startsWith("https://");
      if (isUrl) {
        const cached = pdfBufferCache.get(cfg.termsPdfPath);
        if (cached) {
          attachments.push({
            filename: cached.filename,
            content: cached.content,
          });
        } else {
          // Fallback: let nodemailer fetch it (warmup hasn't run or failed for this URL)
          attachments.push({
            filename: path.basename(cfg.termsPdfPath),
            href: cfg.termsPdfPath,
          });
        }
      } else if (fs.existsSync(cfg.termsPdfPath)) {
        attachments.push({
          filename: path.basename(cfg.termsPdfPath),
          path: cfg.termsPdfPath,
        });
      }
    }

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: booking.userEmail,
      subject: `Booking Confirmed - ${booking.trackingNumber} | ${subjectSuffix}`,
      html,
      attachments,
    };

    try {
      const sends: Promise<any>[] = [transporter.sendMail(mailOptions)];
      if (isCompareSite) {
        sends.push(
          transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: "Compareheathrowparking@gmail.com",
            subject: `Booking Confirmed - ${booking.trackingNumber} | ${subjectSuffix}`,
            html: compareHTML,
          }),
        );
      }
      const [info, compare] = await Promise.all(sends);
      if (!isConfigured) {
        console.log(
          "📧 Email (dev mode):",
          JSON.parse((info as any).message).subject,
        );
      } else {
        console.log("📧 Email sent:", (info as any).messageId);
        if (compare)
          console.log("📧 Compare email sent:", (compare as any).messageId);
      }
    } catch (error) {
      console.error("❌ Email send failed:", error);
      // Don't throw — email failure shouldn't break the booking
    }
  }
}

export const emailService = new EmailService();
