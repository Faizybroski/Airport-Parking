import { Request, Response, NextFunction } from "express";
export declare const getDashboard: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAllBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateBookingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** GET /admin/booking-toggle — return current bookingEnabled state */
export declare const getBookingToggle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** PATCH /admin/booking-toggle — flip bookingEnabled */
export declare const setBookingToggle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map