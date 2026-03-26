import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request & { adminId?: string },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const admin = await authService.getAdminById(req.adminId!);
    res.json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};
