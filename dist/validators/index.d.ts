import { z } from "zod";
export declare const createBookingSchema: z.ZodEffects<z.ZodObject<{
    userName: z.ZodString;
    userEmail: z.ZodString;
    userPhone: z.ZodString;
    carMake: z.ZodString;
    carModel: z.ZodString;
    carNumber: z.ZodString;
    carColor: z.ZodString;
    bookedStartTime: z.ZodString;
    bookedEndTime: z.ZodString;
    departureTerminal: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    departureFlightNo: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    arrivalTerminal: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    arrivalFlightNo: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    userName: string;
    userEmail: string;
    userPhone: string;
    carMake: string;
    carModel: string;
    carNumber: string;
    carColor: string;
    bookedStartTime: string;
    bookedEndTime: string;
    departureTerminal: string;
    departureFlightNo: string;
    arrivalTerminal: string;
    arrivalFlightNo: string;
}, {
    userName: string;
    userEmail: string;
    userPhone: string;
    carMake: string;
    carModel: string;
    carNumber: string;
    carColor: string;
    bookedStartTime: string;
    bookedEndTime: string;
    departureTerminal?: string | undefined;
    departureFlightNo?: string | undefined;
    arrivalTerminal?: string | undefined;
    arrivalFlightNo?: string | undefined;
}>, {
    userName: string;
    userEmail: string;
    userPhone: string;
    carMake: string;
    carModel: string;
    carNumber: string;
    carColor: string;
    bookedStartTime: string;
    bookedEndTime: string;
    departureTerminal: string;
    departureFlightNo: string;
    arrivalTerminal: string;
    arrivalFlightNo: string;
}, {
    userName: string;
    userEmail: string;
    userPhone: string;
    carMake: string;
    carModel: string;
    carNumber: string;
    carColor: string;
    bookedStartTime: string;
    bookedEndTime: string;
    departureTerminal?: string | undefined;
    departureFlightNo?: string | undefined;
    arrivalTerminal?: string | undefined;
    arrivalFlightNo?: string | undefined;
}>;
export declare const updateBookingStatusSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodEnum<["upcoming", "active", "completed", "cancelled"]>;
    actualExitTime: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "upcoming" | "active" | "completed" | "cancelled";
    actualExitTime?: string | undefined;
}, {
    status: "upcoming" | "active" | "completed" | "cancelled";
    actualExitTime?: string | undefined;
}>, {
    status: "upcoming" | "active" | "completed" | "cancelled";
    actualExitTime?: string | undefined;
}, {
    status: "upcoming" | "active" | "completed" | "cancelled";
    actualExitTime?: string | undefined;
}>;
export declare const adminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const pricingConfigSchema: z.ZodObject<{
    pricePerHour: z.ZodNumber;
    discountRules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        minDays: z.ZodNumber;
        percentage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        minDays: number;
        percentage: number;
    }, {
        minDays: number;
        percentage: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    pricePerHour: number;
    discountRules: {
        minDays: number;
        percentage: number;
    }[];
}, {
    pricePerHour: number;
    discountRules?: {
        minDays: number;
        percentage: number;
    }[] | undefined;
}>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;
//# sourceMappingURL=index.d.ts.map