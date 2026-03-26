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

  // attach to request
  req.businessId = businessId;

  next();
};
