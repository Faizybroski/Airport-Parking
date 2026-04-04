import mongoose, { Document, Types } from "mongoose";
import type { BookingStatus } from "../utils/bookingLifecycle";
export type { BookingStatus } from "../utils/bookingLifecycle";
export type PaymentStatus = 'awaiting_payment' | 'paid';
export interface IBooking extends Document {
    businessId: Types.ObjectId;
    userName: string;
    userEmail: string;
    userPhone: string;
    carMake: string;
    carModel: string;
    carNumber: string;
    carColor: string;
    trackingNumber: string;
    bookedStartTime: Date;
    bookedEndTime: Date;
    actualExitTime?: Date | null;
    departureTerminal?: string;
    departureFlightNo?: string;
    arrivalTerminal?: string;
    arrivalFlightNo?: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    stripeSessionId?: string;
    price: number;
    overtimeHours: number;
    overtimePrice: number;
    totalPrice: number;
    pricePerHour: number;
    discountPercent: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Booking: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Booking.d.ts.map