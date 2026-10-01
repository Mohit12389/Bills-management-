import { sql } from "drizzle-orm";
import { bills } from "./schema";

// Bill images live in Cloudflare R2; bills.image_key holds the file name.
// List/stats queries select these columns and use hasImageExtra to know whether a bill
// has an image. The image itself is served on demand by /api/bills/image/[id].

// Every column except imageKey
export const billColumnsNoImage = {
  id: true,
  userId: true,
  categoryId: true,
  vendorId: true,
  amount: true,
  invoiceNumber: true,
  note: true,
  status: true,
  paymentMode: true,
  billedTo: true,
  receivedDate: true,
  paidDate: true,
  dueDate: true,
  isRecurring: true,
  createdAt: true,
  updatedAt: true,
} as const;

// For relational queries: `extras: hasImageExtra`
export const hasImageExtra = (fields: typeof bills._.columns) => ({
  hasImage: sql<boolean>`${fields.imageKey} is not null`.as("has_image"),
});
