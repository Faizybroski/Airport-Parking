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

    // const html = `
    //   <!DOCTYPE html>
    //   <html>
    //     <head>
    //       <style>
    //         body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
    //         .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    //         .header { background: ${cfg.primaryBgColor}; color: #fff; padding: 32px 24px; text-align: center; }
    //         .header-inner { display: inline-flex; align-items: center; justify-content: center; gap: 12px; }
    //         .header img { height: 48px; width: auto; display: block; }
    //         .header .brand { font-weight: bold; font-size: 28px; color: #fff; }
    //         .compare-banner { background: #1a1a2e; color: #fff; padding: 8px 16px; text-align: center; font-size: 12px; letter-spacing: 0.5px; }
    //         .compare-banner strong { color: #a78bfa; }
    //         .body-content { padding: 32px 24px; }
    //         .provider-note { background: #f3f0ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #4b4b6b; }
    //         .provider-note strong { color: #7c3aed; }
    //         .tracking-box { background: ${cfg.primaryBgColor}; border: 2px dashed ${cfg.primaryColor}; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
    //         .tracking-box .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    //         .tracking-box .number { font-size: 28px; font-weight: bold; color: ${cfg.primaryColor}; margin: 4px 0; letter-spacing: 2px; }
    //         .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    //         .detail-row .label { color: #666; font-size: 14px; }
    //         .detail-row .value { font-weight: 600; color: #333; font-size: 14px; }
    //         .section-title { font-size: 16px; font-weight: 600; color: ${cfg.primaryColor}; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e8f0fe; }
    //         .price-box { background: #e8f4e8; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
    //         .price-box .amount { font-size: 32px; font-weight: bold; color: #2a7d2a; }
    //         .terminal-message { background: #fff8e1; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 16px 0; }
    //         .terminal-message strong { color: #92400e; display: block; margin-bottom: 6px; font-size: 14px; }
    //         .terminal-message p { margin: 0; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    //         .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; font-size: 12px; color: #999; }
    //         table { width: 100%; }
    //         td { padding: 10px 0; }
    //       </style>
    //     </head>
    //     <body>
    //       <div class="container">
    //         ${
    //           isCompareSite
    //             ? `
    //         <div class="compare-banner">
    //           Booked via <strong>${COMPARE_SITE_NAME}</strong>
    //         </div>
    //         `
    //             : ""
    //         }
    //         <div class="header">
    //           <div class="header-inner">
    //             <img src="${cfg.logoUrl}" alt="${cfg.brandName} logo" />
    //             ${
    //               cfg.showBrandName
    //                 ? `<span class="brand"
    //               >${cfg.brandName.toUpperCase()}</span
    //             >`
    //                 : ""
    //             }
    //           </div>
    //         </div>
    //         <div class="body-content">
    //           <p>Dear <strong>${booking.userName}</strong>,</p>
    //           ${
    //             isCompareSite
    //               ? `
    //           <p>
    //             Your parking has been booked successfully through
    //             <strong>${COMPARE_SITE_NAME}</strong>. Your parking services are
    //             provided by <strong>${cfg.brandName}</strong>. Here are your booking
    //             details:
    //           </p>
    //           <div class="provider-note">
    //             Parking services provided by <strong>${cfg.brandName}</strong> —
    //             booked via <strong>${COMPARE_SITE_NAME}</strong>.
    //           </div>
    //           `
    //               : `
    //           <p>
    //             Your parking has been booked successfully! Here are your booking
    //             details:
    //           </p>
    //           `
    //           }

    //           <div class="tracking-box">
    //             <div class="label">Your Tracking Number</div>
    //             <div class="number">${booking.trackingNumber}</div>
    //             <div style="font-size: 12px; color: #888">
    //               Use this to track your booking anytime
    //             </div>
    //           </div>

    //           <div class="section-title">📍 Parking Details</div>
    //           <table>
    //             <tr class="detail-row">
    //               <td class="label">Drop-off</td>
    //               <td class="value">${startDate}</td>
    //             </tr>
    //             <tr class="detail-row">
    //               <td class="label">Pick-up</td>
    //               <td class="value">${endDate}</td>
    //             </tr>
    //             <tr class="detail-row">
    //               <td class="label">Duration</td>
    //               <td class="value">${duration}</td>
    //             </tr>
    //             <tr class="detail-row">
    //               <td class="label">Booked Days</td>
    //               <td class="value">${formatDayCount(bookedDays)}</td>
    //             </tr>
    //           </table>

    //           <div class="section-title">🚗 Vehicle Details</div>
    //           <table>
    //             <tr class="detail-row">
    //               <td class="label">Vehicle</td>
    //               <td class="value">${booking.carMake} ${booking.carModel}</td>
    //             </tr>
    //             <tr class="detail-row">
    //               <td class="label">Registration</td>
    //               <td class="value">${booking.carNumber}</td>
    //             </tr>
    //             <tr class="detail-row">
    //               <td class="label">Colour</td>
    //               <td class="value">${booking.carColor}</td>
    //             </tr>
    //           </table>

    //           ${
    //             booking.departureTerminal ||
    //             booking.departureFlightNo ||
    //             booking.arrivalTerminal ||
    //             booking.arrivalFlightNo
    //               ? `
    //           <div class="section-title">✈️ Flight Details</div>
    //           <table>
    //             ${
    //               booking.departureTerminal
    //                 ? `
    //             <tr class="detail-row">
    //               <td class="label">Departure Terminal</td>
    //               <td class="value">${booking.departureTerminal}</td>
    //             </tr>
    //             `
    //                 : ""
    //             } ${
    //               booking.departureFlightNo
    //                 ? `
    //             <tr class="detail-row">
    //               <td class="label">Departure Flight</td>
    //               <td class="value">${booking.departureFlightNo}</td>
    //             </tr>
    //             `
    //                 : ""
    //             } ${
    //               booking.arrivalTerminal
    //                 ? `
    //             <tr class="detail-row">
    //               <td class="label">Arrival Terminal</td>
    //               <td class="value">${booking.arrivalTerminal}</td>
    //             </tr>
    //             `
    //                 : ""
    //             } ${
    //               booking.arrivalFlightNo
    //                 ? `
    //             <tr class="detail-row">
    //               <td class="label">Arrival Flight</td>
    //               <td class="value">${booking.arrivalFlightNo}</td>
    //             </tr>
    //             `
    //                 : ""
    //             }
    //           </table>
    //           `
    //               : ""
    //           }

    //           <div class="terminal-message">
    //             <strong>
    //               Please ensure you contact our team on +44 7903 835808 at least 30
    //               minutes prior to your arrival at the airport, so we can coordinate
    //               your booking and provide a smooth, timely service.
    //             </strong>
    //           </div>

    //           ${
    //             (booking.departureTerminal ||
    //               booking.departureFlightNo ||
    //               booking.arrivalTerminal ||
    //               booking.arrivalFlightNo) &&
    //             terminalMessage
    //               ? `
    //           <div class="terminal-message">
    //             <strong
    //               >📍 ${booking.departureTerminal || "Terminal"} — Important
    //               Information</strong
    //             >
    //             <p>${terminalMessage}</p>
    //           </div>
    //           `
    //               : ""
    //           }

    //           <div class="price-box">
    //             <div
    //               style="
    //                 font-size: 12px;
    //                 color: #666;
    //                 text-transform: uppercase;
    //                 letter-spacing: 1px;
    //               "
    //             >
    //               Total Price
    //             </div>
    //             <div class="amount">${formatPrice(booking.totalPrice)}</div>
    //             ${
    //               booking.discountPercent > 0
    //                 ? `
    //             <div style="font-size: 13px; color: #2a7d2a">
    //               ✅ ${booking.discountPercent}% discount applied
    //             </div>
    //             `
    //                 : ""
    //             }
    //           </div>

    //           <p style="font-size: 14px; color: #666">
    //             If you have any questions, please don't hesitate to contact our
    //             support team.
    //           </p>
    //         </div>
    //         <div class="footer">
    //           <p>
    //             © ${new Date().getFullYear()} ${cfg.brandName}. All rights reserved.
    //           </p>
    //           ${
    //             isCompareSite
    //               ? `
    //           <p>
    //             Booking made via <strong>${COMPARE_SITE_NAME}</strong>. Parking
    //             services provided by ${cfg.brandName}.
    //           </p>
    //           `
    //               : ""
    //           }
    //           <p>
    //             This is an automated confirmation. Please do not reply to this email.
    //           </p>
    //         </div>
    //       </div>
    //     </body>
    //   </html>
    // `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@500&display=swap');

            * { box-sizing: border-box; margin: 0; padding: 0; }

            body {
              font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
              background: #ECEEF2;
              margin: 0;
              padding: 32px 16px;
              -webkit-font-smoothing: antialiased;
            }

            .wrapper {
              max-width: 620px;
              margin: 0 auto;
            }

            /* ── COMPARE BADGE ── */
            .compare-badge {
              text-align: center;
              margin-bottom: 12px;
            }
            .compare-badge span {
              display: inline-block;
              background: #1e1e2e;
              color: #c4b5fd;
              font-size: 11px;
              font-weight: 500;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              padding: 6px 16px;
              border-radius: 999px;
            }
            .compare-badge span strong { color: #a78bfa; }

            /* ── CARD ── */
            .card {
              background: #ffffff;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08);
            }

            /* ── HEADER ── */
            .header {
              background: ${cfg.primaryBgColor};
              padding: 36px 32px;
              text-align: center;
              position: relative;
            }
            .header::after {
              content: '';
              display: block;
              position: absolute;
              bottom: -1px; left: 0; right: 0;
              height: 24px;
              background: #fff;
              border-radius: 24px 24px 0 0;
            }
            .header-inner {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 14px;
            }
            .header img {
              height: 44px;
              width: auto;
              display: block;
              filter: brightness(0) invert(1);
            }
            .header .brand {
              font-size: 26px;
              font-weight: 600;
              color: #fff;
              letter-spacing: -0.5px;
            }

            /* ── BODY ── */
            .body {
              padding: 8px 36px 36px;
            }

            .greeting {
              font-size: 15px;
              color: #444;
              line-height: 1.6;
              margin-bottom: 24px;
            }
            .greeting strong { color: #111; }

            /* ── PROVIDER NOTE ── */
            .provider-note {
              background: #f5f3ff;
              border: 1px solid #ddd6fe;
              border-radius: 10px;
              padding: 12px 16px;
              font-size: 13px;
              color: #5b4a8a;
              margin-bottom: 24px;
              line-height: 1.5;
            }
            .provider-note strong { color: #6d28d9; }

            /* ── TRACKING BOX ── */
            .tracking-box {
              background: ${cfg.primaryBgColor};
              border-radius: 14px;
              padding: 24px;
              text-align: center;
              margin-bottom: 32px;
              position: relative;
              overflow: hidden;
            }
            .tracking-box::before {
              content: '';
              position: absolute;
              inset: 0;
              background: repeating-linear-gradient(
                -45deg,
                rgba(255,255,255,0.03) 0px,
                rgba(255,255,255,0.03) 1px,
                transparent 1px,
                transparent 12px
              );
            }
            .tracking-label {
              font-size: 10px;
              font-weight: 600;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: rgba(255,255,255,0.6);
              margin-bottom: 10px;
            }
            .tracking-number {
              font-family: 'DM Mono', 'Courier New', monospace;
              font-size: 30px;
              font-weight: 500;
              color: #fff;
              letter-spacing: 4px;
            }
            .tracking-sub {
              font-size: 11px;
              color: rgba(255,255,255,0.5);
              margin-top: 8px;
            }

            /* ── SECTION ── */
            .section {
              margin-bottom: 28px;
            }
            .section-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 14px;
            }
            .section-icon {
              width: 28px;
              height: 28px;
              background: ${cfg.primaryBgColor};
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              flex-shrink: 0;
              text-align: center;
              line-height: 28px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 600;
              color: ${cfg.primaryColor};
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }

            /* ── DETAIL ROWS ── */
            .detail-table {
              width: 100%;
              border-collapse: collapse;
              background: #fafafa;
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid #f0f0f0;
            }
            .detail-table tr:not(:last-child) td {
              border-bottom: 1px solid #f0f0f0;
            }
            .detail-table td {
              padding: 12px 16px;
              font-size: 14px;
              vertical-align: middle;
            }
            .detail-table .label {
              color: #888;
              font-weight: 400;
              width: 45%;
            }
            .detail-table .value {
              color: #111;
              font-weight: 600;
              text-align: right;
            }

            /* ── ALERT BOX ── */
            .alert-box {
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 12px;
              padding: 16px 18px;
              margin-bottom: 24px;
              display: flex;
              gap: 12px;
              align-items: flex-start;
            }
            .alert-icon {
              font-size: 18px;
              line-height: 1;
              flex-shrink: 0;
              margin-top: 1px;
            }
            .alert-content strong {
              display: block;
              font-size: 13px;
              font-weight: 600;
              color: #92400e;
              margin-bottom: 4px;
            }
            .alert-content p {
              font-size: 13px;
              color: #78350f;
              line-height: 1.55;
              white-space: pre-wrap;
            }

            /* ── PRICE BOX ── */
            .price-box {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border: 1px solid #bbf7d0;
              border-radius: 14px;
              padding: 24px;
              text-align: center;
              margin-bottom: 24px;
            }
            .price-label {
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              color: #4ade80;
              margin-bottom: 6px;
            }
            .price-amount {
              font-size: 42px;
              font-weight: 600;
              color: #15803d;
              letter-spacing: -1px;
              line-height: 1;
            }
            .discount-badge {
              display: inline-block;
              background: #15803d;
              color: #fff;
              font-size: 12px;
              font-weight: 600;
              padding: 4px 12px;
              border-radius: 999px;
              margin-top: 10px;
            }

            /* ── DIVIDER ── */
            .divider {
              height: 1px;
              background: #f0f0f0;
              margin: 28px 0;
            }

            .help-text {
              font-size: 13px;
              color: #aaa;
              text-align: center;
              line-height: 1.6;
            }

            /* ── FOOTER ── */
            .footer {
              padding: 24px 36px;
              text-align: center;
              background: #f9f9f9;
              border-top: 1px solid #f0f0f0;
            }
            .footer p {
              font-size: 12px;
              color: #bbb;
              line-height: 1.7;
            }
            .footer strong { color: #999; }
          </style>
        </head>
        <body>
          <div class="wrapper">

            ${
              isCompareSite
                ? `
            <div class="compare-badge">
              <span>Booked via <strong>${COMPARE_SITE_NAME}</strong></span>
            </div>
            `
                : ""
            }

            <div class="card">

              <!-- HEADER -->
              <div class="header">
                <div class="header-inner">
                  <img src="${cfg.logoUrl}" alt="${cfg.brandName} logo" />
                  ${cfg.showBrandName ? `<span class="brand">${cfg.brandName.toUpperCase()}</span>` : ""}
                </div>
              </div>

              <!-- BODY -->
              <div class="body">

                <p class="greeting">
                  Hey <strong>${booking.userName}</strong> 👋<br />
                  ${
                    isCompareSite
                      ? `Your parking has been booked successfully through <strong>${COMPARE_SITE_NAME}</strong>. Services are provided by <strong>${cfg.brandName}</strong>.`
                      : `Your parking has been booked successfully! Here are your details.`
                  }
                </p>

                ${
                  isCompareSite
                    ? `
                <div class="provider-note">
                  Parking services provided by <strong>${cfg.brandName}</strong> — booked via <strong>${COMPARE_SITE_NAME}</strong>.
                </div>
                `
                    : ""
                }

                <!-- TRACKING -->
                <div class="tracking-box">
                  <div class="tracking-label">Tracking Number</div>
                  <div class="tracking-number">${booking.trackingNumber}</div>
                  <div class="tracking-sub">Use this to track your booking anytime</div>
                </div>

                <!-- PARKING DETAILS -->
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">Parking Details</div>
                  </div>
                  <table class="detail-table">
                    <tr>
                      <td class="label">Drop-off</td>
                      <td class="value">${startDate}</td>
                    </tr>
                    <tr>
                      <td class="label">Pick-up</td>
                      <td class="value">${endDate}</td>
                    </tr>
                    <tr>
                      <td class="label">Duration</td>
                      <td class="value">${duration}</td>
                    </tr>
                    <tr>
                      <td class="label">Booked Days</td>
                      <td class="value">${formatDayCount(bookedDays)}</td>
                    </tr>
                  </table>
                </div>

                <!-- VEHICLE DETAILS -->
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">Vehicle Details</div>
                  </div>
                  <table class="detail-table">
                    <tr>
                      <td class="label">Vehicle</td>
                      <td class="value">${booking.carMake} ${booking.carModel}</td>
                    </tr>
                    <tr>
                      <td class="label">Registration</td>
                      <td class="value">${booking.carNumber}</td>
                    </tr>
                    <tr>
                      <td class="label">Colour</td>
                      <td class="value">${booking.carColor}</td>
                    </tr>
                  </table>
                </div>

                <!-- FLIGHT DETAILS (conditional) -->
                ${
                  booking.departureTerminal ||
                  booking.departureFlightNo ||
                  booking.arrivalTerminal ||
                  booking.arrivalFlightNo
                    ? `
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">Flight Details</div>
                  </div>
                  <table class="detail-table">
                    ${
                      booking.departureTerminal
                        ? `
                    <tr>
                      <td class="label">Departure Terminal</td>
                      <td class="value">${booking.departureTerminal}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      booking.departureFlightNo
                        ? `
                    <tr>
                      <td class="label">Departure Flight</td>
                      <td class="value">${booking.departureFlightNo}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      booking.arrivalTerminal
                        ? `
                    <tr>
                      <td class="label">Arrival Terminal</td>
                      <td class="value">${booking.arrivalTerminal}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      booking.arrivalFlightNo
                        ? `
                    <tr>
                      <td class="label">Arrival Flight</td>
                      <td class="value">${booking.arrivalFlightNo}</td>
                    </tr>`
                        : ""
                    }
                  </table>
                </div>
                `
                    : ""
                }

                <!-- CALL AHEAD ALERT -->
                <div class="alert-box">
                  <div class="alert-content">
                    <strong>Action Required Before Arrival</strong>
                    <p>Please contact our team on +44 7903 835808 at least 30 minutes prior to your arrival at the airport, so we can coordinate your booking and provide a smooth, timely service.</p>
                  </div>
                </div>

                <!-- TERMINAL MESSAGE (conditional) -->
                ${
                  (booking.departureTerminal ||
                    booking.departureFlightNo ||
                    booking.arrivalTerminal ||
                    booking.arrivalFlightNo) &&
                  terminalMessage
                    ? `
                <div class="alert-box">
                  <div class="alert-content">
                    <strong>${booking.departureTerminal || "Terminal"} — Important Information</strong>
                    <p>${terminalMessage}</p>
                  </div>
                </div>
                `
                    : ""
                }

                <!-- PRICE -->
                <div class="price-box">
                  <div class="price-label">Total Price</div>
                  <div class="price-amount">${formatPrice(booking.totalPrice)}</div>
                  ${
                    booking.discountPercent > 0
                      ? `
                  <div class="discount-badge">✅ ${booking.discountPercent}% discount applied</div>
                  `
                      : ""
                  }
                </div>

                <div class="divider"></div>

                <p class="help-text">
                  Questions? Our support team is always happy to help. <br />
                  Just reach out and we'll sort it out.
                </p>

              </div>

              <!-- FOOTER -->
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${cfg.brandName}. All rights reserved.</p>
                ${
                  isCompareSite
                    ? `
                <p>Booking made via <strong>${COMPARE_SITE_NAME}</strong>. Parking services provided by ${cfg.brandName}.</p>
                `
                    : ""
                }
                <p>This is an automated confirmation. Please do not reply to this email.</p>
              </div>

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
