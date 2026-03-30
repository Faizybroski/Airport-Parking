import { Request, Response, NextFunction } from "express";
export declare const createBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPricingConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getBookingByTracking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const calculatePrice: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** GET /api/bookings/status — public check: is booking open? */
export declare const getBookingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map