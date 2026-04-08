import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthRequest extends Request {
  adminId?: string;
  adminBusinessId?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = req.cookies?.parkpro_token;

    if (!token) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      businessId?: string;
    };

    req.adminId = decoded.id;
    req.adminBusinessId = decoded.businessId;

    // If the request carries an x-business-id header, verify the admin
    // actually belongs to that business.
    const requestedBusinessId = req.headers["x-business-id"] as string | undefined;
    if (requestedBusinessId && decoded.businessId) {
      if (decoded.businessId !== requestedBusinessId) {
        res.status(403).json({
          success: false,
          message: "Access denied: you do not belong to this business",
        });
        return;
      }
    }

    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
