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
      isCompareAdmin?: boolean;
    };

    // Prevent compare admins from using the business-scoped auth path
    if (decoded.isCompareAdmin) {
      res.status(403).json({
        success: false,
        message: "Please use the compare admin panel",
      });
      return;
    }

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

/**
 * Auth middleware for the compare admin panel.
 * Reads the compare_token cookie (set by /compare/login) and allows access
 * to any business — no X-Business-Id scoping check is performed.
 */
export const compareAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = req.cookies?.compare_token;

    if (!token) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      businessId?: string;
      isCompareAdmin?: boolean;
    };

    if (!decoded.isCompareAdmin) {
      res.status(403).json({
        success: false,
        message: "Access denied: compare admin credentials required",
      });
      return;
    }

    req.adminId = decoded.id;
    // compareAdmin can proxy requests for any business — do not lock to one
    req.adminBusinessId = undefined;

    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
