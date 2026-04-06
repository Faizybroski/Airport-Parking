"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigSchema = exports.bookingBulkSelectionSchema = exports.adminLoginSchema = exports.updateBookingStatusSchema = exports.createBookingSchema = void 0;
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
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid booking id");
exports.bookingBulkSelectionSchema = zod_1.z
    .object({
    selectionMode: zod_1.z.enum(["selected", "allMatching"]),
    ids: zod_1.z.array(objectIdSchema).optional().default([]),
    excludeIds: zod_1.z.array(objectIdSchema).optional().default([]),
    search: zod_1.z.string().trim().optional(),
    status: zod_1.z.enum(bookingLifecycle_1.BOOKING_STATUS_VALUES).optional(),
})
    .superRefine((data, ctx) => {
    if (data.selectionMode === "selected" && data.ids.length === 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["ids"],
            message: "Select at least one booking",
        });
    }
});
const pricingRuleSchema = zod_1.z
    .object({
    startDay: zod_1.z.number().int("Start day must be a whole number").min(1),
    endDay: zod_1.z.number().int("End day must be a whole number").min(1).nullable().optional(),
    basePrice: zod_1.z.number().min(0, "Base price must be >= 0"),
    dailyIncrement: zod_1.z.number().min(0, "Daily increment must be >= 0"),
})
    .superRefine((rule, ctx) => {
    if (rule.endDay !== null &&
        rule.endDay !== undefined &&
        rule.endDay < rule.startDay) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["endDay"],
            message: "End day must be greater than or equal to start day",
        });
    }
});
exports.pricingConfigSchema = zod_1.z
    .object({
    pricingRules: zod_1.z.array(pricingRuleSchema).min(1).optional(),
    firstTenDayPrices: zod_1.z
        .array(zod_1.z.number().min(0, "Price must be >= 0"))
        .length(10, "Exactly 10 day prices are required")
        .optional(),
})
    .superRefine((data, ctx) => {
    if ((!data.pricingRules || data.pricingRules.length === 0) &&
        !data.firstTenDayPrices) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["pricingRules"],
            message: "At least one pricing rule is required",
        });
        return;
    }
    if (!data.pricingRules?.length) {
        return;
    }
    const sortedRules = [...data.pricingRules].sort((a, b) => a.startDay - b.startDay);
    let expectedStartDay = 1;
    sortedRules.forEach((rule, index) => {
        if (rule.startDay !== expectedStartDay) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["pricingRules", index, "startDay"],
                message: "Pricing rules must start at day 1 and continue without gaps",
            });
        }
        const isLastRule = index === sortedRules.length - 1;
        if (!isLastRule && (rule.endDay === null || rule.endDay === undefined)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["pricingRules", index, "endDay"],
                message: "Only the final pricing rule can be open-ended",
            });
            return;
        }
        if (!isLastRule) {
            expectedStartDay = rule.endDay + 1;
        }
    });
    const lastRule = sortedRules[sortedRules.length - 1];
    if (lastRule.endDay !== null && lastRule.endDay !== undefined) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["pricingRules", sortedRules.length - 1, "endDay"],
            message: "The final pricing rule must be open-ended",
        });
    }
});
//# sourceMappingURL=index.js.map