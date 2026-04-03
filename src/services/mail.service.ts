import nodemailer from "nodemailer";
import { config } from "../config";

class ContactEmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(config.contactSmtp.user && config.contactSmtp.pass);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: config.contactSmtp.host,
        port: config.contactSmtp.port,
        secure: config.contactSmtp.port === 465,
        auth: {
          user: config.contactSmtp.user,
          pass: config.contactSmtp.pass,
        },
      });
    } else {
      // Dev mode: log to console
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log(
        "📧 Email: SMTP not configured, emails will be logged to console.",
      );
    }
  }

  async sendContactEmail(
    name: string,
    email: string,
    message: string,
  ): Promise<void> {
    const html = `
    <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8b 100%); color: #fff; padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; letter-spacing: 1px; }
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }

          .body-content { padding: 32px 24px; }

          .message-box {
            background: #f0f7ff;
            border: 2px dashed #2d5f8b;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
          }

          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #1e3a5f;
            margin: 24px 0 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e8f0fe;
          }

          table { width: 100%; }
          td { padding: 10px 0; }

          .detail-row {
            border-bottom: 1px solid #eee;
          }

          .label {
            color: #666;
            font-size: 14px;
          }

          .value {
            font-weight: 600;
            color: #333;
            font-size: 14px;
            text-align: right;
          }

          .footer {
            background: #f8f9fa;
            padding: 20px 24px;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>

      <body>
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <h1>🅿️ ParkPro</h1>
            <p>New Contact Message</p>
          </div>

          <!-- Body -->
          <div class="body-content">

            <p>You have received a new message from your website contact form.</p>

            <!-- User Info -->
            <div class="section-title">👤 Sender Details</div>
            <table>
              <tr class="detail-row">
                <td class="label">Name</td>
                <td class="value">${name}</td>
              </tr>
              <tr class="detail-row">
                <td class="label">Email</td>
                <td class="value">${email}</td>
              </tr>
            </table>

            <!-- Message -->
            <div class="section-title">💬 Message</div>
            <div class="message-box">
              ${message}
            </div>

            <p style="font-size: 14px; color: #666;">
              You can reply directly to this email to respond to the sender.
            </p>

          </div>

          <!-- Footer -->
          <div class="footer">
            <p>© ${new Date().getFullYear()} ParkPro Airport Parking. All rights reserved.</p>
            <p>This message was sent via the contact form.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${name}" <${config.contactEmail}>`,
      to: config.contactEmail,
      subject: `New Contact Form Submission from ${name}`,
      replyTo: email,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      if (!this.isConfigured) {
        console.log("📧 Email (dev mode):", JSON.parse(info.message).subject);
      } else {
        console.log("📧 Email sent:", info.messageId);
      }
    } catch (error) {
      console.error("❌ Email send failed:", error);
      // Don't throw — email failure shouldn't break the booking
    }
  }
}

export const contactEmailService = new ContactEmailService();
