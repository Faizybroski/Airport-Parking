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
export declare const bookingBulkSelectionSchema: z.ZodEffects<z.ZodObject<{
    selectionMode: z.ZodEnum<["selected", "allMatching"]>;
    ids: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    excludeIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["upcoming", "active", "completed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    selectionMode: "selected" | "allMatching";
    ids: string[];
    excludeIds: string[];
    search?: string | undefined;
    status?: "upcoming" | "active" | "completed" | "cancelled" | undefined;
}, {
    selectionMode: "selected" | "allMatching";
    search?: string | undefined;
    status?: "upcoming" | "active" | "completed" | "cancelled" | undefined;
    ids?: string[] | undefined;
    excludeIds?: string[] | undefined;
}>, {
    selectionMode: "selected" | "allMatching";
    ids: string[];
    excludeIds: string[];
    search?: string | undefined;
    status?: "upcoming" | "active" | "completed" | "cancelled" | undefined;
}, {
    selectionMode: "selected" | "allMatching";
    search?: string | undefined;
    status?: "upcoming" | "active" | "completed" | "cancelled" | undefined;
    ids?: string[] | undefined;
    excludeIds?: string[] | undefined;
}>;
export declare const pricingConfigSchema: z.ZodEffects<z.ZodObject<{
    pricingRules: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        startDay: z.ZodNumber;
        endDay: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        basePrice: z.ZodNumber;
        dailyIncrement: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }, {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }>, {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }, {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }>, "many">>;
    firstTenDayPrices: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    pricingRules?: {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }[] | undefined;
    firstTenDayPrices?: number[] | undefined;
}, {
    pricingRules?: {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }[] | undefined;
    firstTenDayPrices?: number[] | undefined;
}>, {
    pricingRules?: {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }[] | undefined;
    firstTenDayPrices?: number[] | undefined;
}, {
    pricingRules?: {
        startDay: number;
        basePrice: number;
        dailyIncrement: number;
        endDay?: number | null | undefined;
    }[] | undefined;
    firstTenDayPrices?: number[] | undefined;
}>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type BookingBulkSelectionInput = z.infer<typeof bookingBulkSelectionSchema>;
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;
//# sourceMappingURL=index.d.ts.map