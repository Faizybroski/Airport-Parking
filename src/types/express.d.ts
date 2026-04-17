import "express";

declare global {
  namespace Express {
    interface Request {
      businessId?: string;
      /** businessId extracted from the admin's JWT — used to scope access */
      adminBusinessId?: string;
      /** When set, all booking queries are filtered to this origin value */
      bookedVia?: string;
    }
  }
}
