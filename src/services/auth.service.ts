import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Admin, IAdmin } from "../models/Admin";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";

class AuthService {
  /**
   * Admin login — returns a JWT that includes the admin's businessId so the
   * auth middleware can enforce business-scoped access without a DB lookup on
   * every request.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; admin: Partial<IAdmin> }> {
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign(
      {
        id: admin._id,
        businessId: admin.businessId.toString(),
        isCompareAdmin: admin.isCompareAdmin ?? false,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] },
    ) as unknown as string;

    return {
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        businessId: admin.businessId,
        isCompareAdmin: admin.isCompareAdmin ?? false,
      },
    };
  }

  /** Get admin by ID (excludes password). */
  async getAdminById(id: string): Promise<IAdmin | null> {
    return await Admin.findById(id).select("-password");
  }

  /**
   * Generates a password-reset token for the given email.
   * Stores only the SHA-256 hash in the DB; returns the raw token to be emailed.
   * Throws if the email is not found so callers can decide whether to surface that.
   */
  async forgotPassword(email: string): Promise<{ token: string; admin: IAdmin }> {
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new AppError("No account found with that email address", 404);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    admin.resetPasswordToken = hashedToken;
    admin.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await admin.save();

    return { token: rawToken, admin };
  }

  /**
   * Verifies the raw reset token and sets a new password.
   * Clears the token fields after a successful reset.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!admin) {
      throw new AppError("Reset token is invalid or has expired", 400);
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();
  }

  /**
   * Changes the password for an authenticated admin.
   * Requires the current password to be correct.
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new AppError("Admin not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", 401);
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();
  }
}

export const authService = new AuthService();
