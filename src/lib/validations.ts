import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Name must be under 50 characters"),
  icon: z.string().default("Package"),
  color: z.string().default("#6366f1"),
});

export const vendorSchema = z.object({
  name: z
    .string()
    .min(1, "Vendor name is required")
    .max(100, "Name must be under 100 characters"),
  categoryId: z.string().uuid("Invalid category"),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
});

export const billSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  vendorId: z.string().uuid("Select a vendor").optional().nullable(),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  note: z.string().max(500).optional().nullable(),
  imageKey: z.string().max(200).optional().nullable(),
  receivedDate: z.string().min(1, "Received date is required"),
  dueDate: z.string().optional().nullable(),
  billedTo: z.enum(["anchal_sweets", "anchal_caterers", "anchal_caterers_original"]).optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
});
