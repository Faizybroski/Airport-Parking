import { z } from "zod";
import { BOOKING_STATUS_VALUES } from "../utils/bookingLifecycle";

export const createBookingSchema = z
  .object({
    userName: z.string().min(2, "Name must be at least 2 characters").max(100),
    userEmail: z.string().email("Invalid email address"),
    userPhone: z.string().min(7, "Phone must be at least 7 characters").max(20),
    carMake: z.string().min(1, "Car make is required").max(50),
    carModel: z.string().min(1, "Car model is required").max(50),
    carNumber: z.string().min(1, "Car number is required").max(20),
    carColor: z.string().min(1, "Car color is required").max(30),
    bookedStartTime: z
      .string()
      .datetime({ message: "Invalid start date/time" }),
    bookedEndTime: z.string().datetime({ message: "Invalid end date/time" }),
    departureTerminal: z.string().max(10).optional().default(""),
    departureFlightNo: z.string().max(20).optional().default(""),
    arrivalTerminal: z.string().max(10).optional().default(""),
    arrivalFlightNo: z.string().max(20).optional().default(""),
    bookedVia: z.string().max(50).optional().default(""),
    tierId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tier id").optional(),
  })
  .refine(
    (data) => new Date(data.bookedEndTime) > new Date(data.bookedStartTime),
    { message: "End time must be after start time", path: ["bookedEndTime"] },
  );

export const updateBookingStatusSchema = z
  .object({
    status: z.enum(BOOKING_STATUS_VALUES),
    actualExitTime: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actualExitTime && data.status !== "completed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actualExitTime"],
        message:
          "actualExitTime can only be sent when marking a booking completed",
      });
    }
  });

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid booking id");

export const bookingBulkSelectionSchema = z
  .object({
    selectionMode: z.enum(["selected", "allMatching"]),
    ids: z.array(objectIdSchema).optional().default([]),
    excludeIds: z.array(objectIdSchema).optional().default([]),
    search: z.string().trim().optional(),
    status: z.enum(BOOKING_STATUS_VALUES).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.selectionMode === "selected" && data.ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ids"],
        message: "Select at least one booking",
      });
    }
  });

const pricingRuleSchema = z
  .object({
    startDay: z.number().int("Start day must be a whole number").min(1),
    endDay: z.number().int("End day must be a whole number").min(1).nullable().optional(),
    basePrice: z.number().min(0, "Base price must be >= 0"),
    dailyIncrement: z.number().min(0, "Daily increment must be >= 0"),
  })
  .superRefine((rule, ctx) => {
    if (
      rule.endDay !== null &&
      rule.endDay !== undefined &&
      rule.endDay < rule.startDay
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDay"],
        message: "End day must be greater than or equal to start day",
      });
    }
  });

export const pricingConfigSchema = z
  .object({
    pricingRules: z.array(pricingRuleSchema).min(1).optional(),
    firstTenDayPrices: z
      .array(z.number().min(0, "Price must be >= 0"))
      .length(10, "Exactly 10 day prices are required")
      .optional(),
    day11To30Increment: z.number().min(0, "Increment must be >= 0").optional(),
    day31PlusIncrement: z.number().min(0, "Increment must be >= 0").optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (!data.pricingRules || data.pricingRules.length === 0) &&
      !data.firstTenDayPrices
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricingRules"],
        message: "At least one pricing rule is required",
      });
      return;
    }

    if (!data.pricingRules?.length) {
      return;
    }

    const sortedRules = [...data.pricingRules].sort(
      (a, b) => a.startDay - b.startDay,
    );

    let expectedStartDay = 1;

    sortedRules.forEach((rule, index) => {
      if (rule.startDay !== expectedStartDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingRules", index, "startDay"],
          message:
            "Pricing rules must start at day 1 and continue without gaps",
        });
      }

      const isLastRule = index === sortedRules.length - 1;

      if (!isLastRule && (rule.endDay === null || rule.endDay === undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingRules", index, "endDay"],
          message: "Only the final pricing rule can be open-ended",
        });
        return;
      }

      if (!isLastRule) {
        expectedStartDay = (rule.endDay as number) + 1;
      }
    });

    const lastRule = sortedRules[sortedRules.length - 1];
    if (lastRule.endDay !== null && lastRule.endDay !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricingRules", sortedRules.length - 1, "endDay"],
        message: "The final pricing rule must be open-ended",
      });
    }
  });

export const createBusinessTierSchema = z.object({
  name: z.string().min(1, "Tier name is required").max(100),
  description: z.string().max(500).optional().default(""),
  features: z
    .array(z.string().min(1).max(200))
    .min(1, "At least one feature is required"),
  firstTenDayPrices: z
    .array(z.number().min(0, "Price must be >= 0"))
    .length(10, "Exactly 10 day prices are required"),
  day11To30Increment: z.number().min(0, "Increment must be >= 0"),
  day31PlusIncrement: z.number().min(0, "Increment must be >= 0"),
  isActive: z.boolean().optional().default(true),
});

export const updateBusinessTierSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  features: z.array(z.string().min(1).max(200)).min(1).optional(),
  firstTenDayPrices: z
    .array(z.number().min(0))
    .length(10, "Exactly 10 day prices are required")
    .optional(),
  day11To30Increment: z.number().min(0).optional(),
  day31PlusIncrement: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const assignTierSchema = z.object({
  tierId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid tier id")
    .nullable(),
});

export type CreateBusinessTierInput = z.infer<typeof createBusinessTierSchema>;
export type UpdateBusinessTierInput = z.infer<typeof updateBusinessTierSchema>;
export type AssignTierInput = z.infer<typeof assignTierSchema>;

export const TERMINAL_VALUES = ["T1", "T2", "T3", "T4", "T5"] as const;
export type TerminalValue = (typeof TERMINAL_VALUES)[number];

export const updateTerminalMessagesSchema = z.object({
  messages: z.record(z.string().max(1000)).refine(
    (m) => Object.keys(m).every((k) => TERMINAL_VALUES.includes(k as TerminalValue)),
    { message: "Keys must be one of T1–T5" },
  ),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type BookingBulkSelectionInput = z.infer<typeof bookingBulkSelectionSchema>;
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;
export type UpdateTerminalMessagesInput = z.infer<typeof updateTerminalMessagesSchema>;
