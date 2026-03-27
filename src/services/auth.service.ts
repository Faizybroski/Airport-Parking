import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin, IAdmin } from "../models/Admin";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";

class AuthService {
  /**
   * Admin login
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

    // const token = jwt.sign({ id: admin._id }, config.jwtSecret, {
    //   expiresIn: config.jwtExpiresIn,
    // } as jwt.SignOptions);

    const token = jwt.sign(
      { id: admin._id }, // or however your data looks
      config.jwtSecret,
      { expiresIn: "7d" },
    ) as unknown as string;

    return {
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  /**
   * Get admin by ID
   */
  async getAdminById(id: string): Promise<IAdmin | null> {
    return await Admin.findById(id).select("-password");
  }
}

export const authService = new AuthService();
