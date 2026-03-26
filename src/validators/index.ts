import { z } from "zod";

export const createBookingSchema = z
  .object({
    // businessId: z.string().min(1, "Business ID is required").max(50),
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
  })
  .refine(
    (data) => new Date(data.bookedEndTime) > new Date(data.bookedStartTime),
    { message: "End time must be after start time", path: ["bookedEndTime"] },
  );

export const updateBookingStatusSchema = z.object({
  status: z.enum(["upcoming", "active", "completed", "cancelled"]),
  actualExitTime: z.string().datetime().optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateSlotSchema = z.object({
  status: z.enum(["available", "occupied"]),
});

export const pricingConfigSchema = z.object({
  pricePerHour: z.number().min(0, "Price must be >= 0"),
  discountRules: z
    .array(
      z.object({
        minDays: z.number().int().min(1),
        percentage: z.number().min(0).max(100),
      }),
    )
    .default([]),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;
