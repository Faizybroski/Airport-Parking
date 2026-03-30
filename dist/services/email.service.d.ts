import { IBooking } from '../models/Booking';
declare class EmailService {
    private transporter;
    private isConfigured;
    constructor();
    sendBookingConfirmation(booking: IBooking): Promise<void>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.service.d.ts.map