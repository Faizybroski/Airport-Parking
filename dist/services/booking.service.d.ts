import { IBooking, BookingStatus } from "../models/Booking";
import { CreateBookingInput } from "../validators";
declare class BookingService {
    createBooking(businessId: string, data: CreateBookingInput): Promise<IBooking>;
    getByTrackingNumber(businessId: string, trackingNumber: string): Promise<IBooking>;
    getAllBookings(params: {
        businessId: string;
        status?: BookingStatus;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        bookings: IBooking[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    updateStatus(businessId: string, id: string, status: BookingStatus, actualExitTime?: string): Promise<IBooking>;
    getDashboardStats(businessId: string): Promise<{
        businessId: string;
        totalBookings: number;
        activeBookings: number;
        upcomingBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        totalRevenue: number;
        todayBookings: number;
        bookingEnabled: boolean;
    }>;
    exportBookingsCSV(businessId: string, status?: BookingStatus): Promise<string>;
}
export declare const bookingService: BookingService;
export {};
//# sourceMappingURL=booking.service.d.ts.map