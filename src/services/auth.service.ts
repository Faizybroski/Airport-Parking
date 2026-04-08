import bcrypt from "bcryptjs";
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
      { id: admin._id, businessId: admin.businessId.toString() },
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
      },
    };
  }

  /** Get admin by ID (excludes password). */
  async getAdminById(id: string): Promise<IAdmin | null> {
    return await Admin.findById(id).select("-password");
  }
}

export const authService = new AuthService();
