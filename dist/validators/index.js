"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigSchema = exports.adminLoginSchema = exports.updateBookingStatusSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
const bookingLifecycle_1 = require("../utils/bookingLifecycle");
exports.createBookingSchema = zod_1.z
    .object({
    userName: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100),
    userEmail: zod_1.z.string().email("Invalid email address"),
    userPhone: zod_1.z.string().min(7, "Phone must be at least 7 characters").max(20),
    carMake: zod_1.z.string().min(1, "Car make is required").max(50),
    carModel: zod_1.z.string().min(1, "Car model is required").max(50),
    carNumber: zod_1.z.string().min(1, "Car number is required").max(20),
    carColor: zod_1.z.string().min(1, "Car color is required").max(30),
    bookedStartTime: zod_1.z
        .string()
        .datetime({ message: "Invalid start date/time" }),
    bookedEndTime: zod_1.z.string().datetime({ message: "Invalid end date/time" }),
    departureTerminal: zod_1.z.string().max(10).optional().default(""),
    departureFlightNo: zod_1.z.string().max(20).optional().default(""),
    arrivalTerminal: zod_1.z.string().max(10).optional().default(""),
    arrivalFlightNo: zod_1.z.string().max(20).optional().default(""),
})
    .refine((data) => new Date(data.bookedEndTime) > new Date(data.bookedStartTime), { message: "End time must be after start time", path: ["bookedEndTime"] });
exports.updateBookingStatusSchema = zod_1.z
    .object({
    status: zod_1.z.enum(bookingLifecycle_1.BOOKING_STATUS_VALUES),
    actualExitTime: zod_1.z.string().datetime().optional(),
})
    .superRefine((data, ctx) => {
    if (data.actualExitTime && data.status !== "completed") {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["actualExitTime"],
            message: "actualExitTime can only be sent when marking a booking completed",
        });
    }
});
exports.adminLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.pricingConfigSchema = zod_1.z.object({
    firstTenDayPrices: zod_1.z
        .array(zod_1.z.number().min(0, "Price must be >= 0"))
        .length(10, "Exactly 10 day prices are required"),
});
//# sourceMappingURL=index.js.map