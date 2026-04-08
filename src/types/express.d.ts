import "express";

declare global {
  namespace Express {
    interface Request {
      businessId?: string;
      /** businessId extracted from the admin's JWT — used to scope access */
      adminBusinessId?: string;
    }
  }
}
