import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthRequest extends Request {
  adminId?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // const authHeader = req.headers.authorization;
    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //   res.status(401).json({ success: false, message: 'No token provided' });
    //   return;
    // }

    // const token = authHeader.split(' ')[1];

    const token = req.cookies?.parkpro_token;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    req.adminId = decoded.id;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
