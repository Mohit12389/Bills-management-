import { sql } from "drizzle-orm";
import { bills } from "./schema";

// Bill images live in Cloudflare R2 (bills.image_key). Older bills may still have a
// legacy base64 image in bills.image_url (up to ~400KB each) until they are migrated.
// Every list/stats query must select these columns instead of the full row,
// and use hasImageExtra to know whether an image exists without downloading it.
// The image itself is served on demand by /api/bills/image/[id].

// Every column EXCEPT imageUrl / imageKey
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
  hasImage: sql<boolean>`(${fields.imageKey} is not null or ${fields.imageUrl} is not null)`.as("has_image"),
});
