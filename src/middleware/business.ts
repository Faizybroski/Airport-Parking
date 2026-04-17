import { Request, Response, NextFunction } from "express";

export const attachBusinessId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const businessId = req.headers["x-business-id"] as string;

  if (!businessId) {
    return res.status(400).json({
      success: false,
      message: "X-Business-Id header missing",
    });
  }

  req.businessId = businessId;
  next();
};

/**
 * Middleware factory — stamps req.bookedVia so all downstream service calls
 * filter queries to bookings that originated from a specific source.
 */
export const requireBookedVia =
  (bookedVia: string) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.bookedVia = bookedVia;
    next();
  };
