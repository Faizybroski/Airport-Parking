import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { AppError } from "../middleware/errorHandler";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("parkpro_token", result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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

export const compareLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (!result.admin.isCompareAdmin) {
      throw new AppError("Access denied: not a compare admin account", 403);
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("compare_token", result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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

export const compareLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("compare_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });
    res.json({ success: true, message: "Logged out successfully" });
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
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("parkpro_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });
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
