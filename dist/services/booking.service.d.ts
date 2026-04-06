import { IBooking, BookingStatus } from "../models/Booking";
import { BookingBulkSelectionInput, CreateBookingInput } from "../validators";
type BookingListParams = {
    businessId: string;
    status?: BookingStatus;
    page?: number;
    limit?: number;
    search?: string;
};
type BookingSelectionScope = BookingBulkSelectionInput & {
    businessId: string;
};
declare class BookingService {
    createBooking(businessId: string, data: CreateBookingInput): Promise<IBooking>;
    attachStripeSession(bookingId: string, sessionId: string): Promise<void>;
    confirmPayment(sessionId: string): Promise<IBooking | null>;
    cancelPendingBooking(sessionId: string): Promise<void>;
    getBySessionId(sessionId: string): Promise<IBooking | null>;
    getByTrackingNumber(businessId: string, trackingNumber: string): Promise<IBooking>;
    private buildBookingsQuery;
    private buildSelectionQuery;
    private getBookingsForSelection;
    getAllBookings(params: BookingListParams): Promise<{
        bookings: IBooking[];
        total: number;
        page: number;
        totalPages: number;
        limit: number;
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
        overtimeRevenue: number;
        stripeRevenue: number;
        baseRevenue: number;
        todayBookings: number;
        bookingEnabled: boolean;
    }>;
    exportBookingsExcel(selection: BookingSelectionScope): Promise<Buffer>;
    deleteBooking(businessId: string, id: string): Promise<void>;
    bulkDeleteBookings(selection: BookingSelectionScope): Promise<{
        deletedCount: number;
        deletedIds: string[];
    }>;
}
export declare const bookingService: BookingService;
export {};
//# sourceMappingURL=booking.service.d.ts.map