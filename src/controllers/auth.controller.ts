import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import jwt from "jsonwebtoken";
import { config } from "../config";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    const environment = process.env.environment;

    res.cookie("parkpro_token", result.token, {
      httpOnly: true,
      secure: environment === "production",
      sameSite: environment === "production" ? "none" : "lax",
      path: "/",
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.clearCookie("parkpro_token");
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request & { adminId?: string },
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admin = await authService.getAdminById(req.adminId!);
    res.json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};
