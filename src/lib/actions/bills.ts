"use server";

import { db } from "@/db";
import { bills, categories, vendors } from "@/db/schema";
import { billColumnsNoImage, hasImageExtra } from "@/db/bill-columns";
import { getCurrentUser } from "@/lib/auth";
import { billSchema } from "@/lib/validations";
import { eq, and, gte, lte, desc, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MAX_IMAGE_BYTES, deleteImages, getImageSize, isOwnBillImageKey } from "@/lib/r2";

export interface BillFilters {
  status?: "paid" | "unpaid" | "all";
  categoryId?: string;
  vendorId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Make sure the category/vendor referenced by a bill belong to this user
async function assertOwnsCategoryAndVendor(
  userId: string,
  categoryId?: string,
  vendorId?: string | null
) {
  // Run both checks in parallel — each query is a separate HTTP round trip to Neon
  const [category, vendor] = await Promise.all([
    categoryId
      ? db.query.categories.findFirst({
          where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
          columns: { id: true },
        })
      : null,
    vendorId
      ? db.query.vendors.findFirst({
          where: and(eq(vendors.id, vendorId), eq(vendors.userId, userId)),
          columns: { id: true },
        })
      : null,
  ]);
  if (categoryId && !category) throw new Error("Category not found");
  if (vendorId && !vendor) throw new Error("Vendor not found");
}

// An image key sent by the browser must be one of this user's own uploads, and the
// upload must actually have finished — otherwise the bill would point at nothing.
async function assertValidUploadedImage(userId: string, imageKey: string) {
  if (!isOwnBillImageKey(imageKey, userId)) throw new Error("Invalid image");
  const size = await getImageSize(imageKey);
  if (size === null || size > MAX_IMAGE_BYTES) throw new Error("Image upload not found");
}

export async function getBills(filters: BillFilters = {}) {
  const user = await getCurrentUser();
  const {
    status = "all",
    categoryId,
    vendorId,
    from,
    to,
    search,
  } = filters;

  const conditions = [eq(bills.userId, user.id)];

  if (status !== "all") {
    conditions.push(eq(bills.status, status));
  }
  if (categoryId) {
    conditions.push(eq(bills.categoryId, categoryId));
  }
  if (vendorId) {
    conditions.push(eq(bills.vendorId, vendorId));
  }
  if (from) {
    conditions.push(gte(bills.receivedDate, new Date(from)));
  }
  if (to) {
    conditions.push(lte(bills.receivedDate, new Date(to + "T23:59:59")));
  }
  if (search) {
    conditions.push(ilike(bills.note, `%${search}%`));
  }

  // No limit — all bills loaded, filtered client-side.
  // Never select image_url here: it holds the full base64 image.
  const result = await db.query.bills.findMany({
    where: and(...conditions),
    columns: billColumnsNoImage,
    extras: hasImageExtra,
    with: {
      category: true,
      vendor: true,
    },
    orderBy: [desc(bills.createdAt)],
  });

  // Images are loaded on-demand via /api/bills/image/[id]
  return result.map(({ hasImage, ...bill }) => ({
    ...bill,
    imageUrl: hasImage ? "has_image" : null,
  }));
}

export async function getBillById(id: string) {
  const user = await getCurrentUser();

  return db.query.bills.findFirst({
    where: and(eq(bills.id, id), eq(bills.userId, user.id)),
    columns: billColumnsNoImage,
    with: {
      category: true,
      vendor: true,
    },
  });
}

export async function createBill(data: {
  categoryId: string;
  vendorId?: string | null;
  invoiceNumber?: string | null;
  amount: string;
  note?: string | null;
  imageKey?: string | null;
  receivedDate: string;
  dueDate?: string | null;
  isRecurring?: "none" | "daily" | "weekly" | "monthly";
  billedTo?: "anchal_sweets" | "anchal_caterers" | null;
}) {
  const user = await getCurrentUser();
  const validated = billSchema.parse(data);
  await Promise.all([
    assertOwnsCategoryAndVendor(user.id, validated.categoryId, validated.vendorId),
    validated.imageKey ? assertValidUploadedImage(user.id, validated.imageKey) : null,
  ]);

  const [bill] = await db
    .insert(bills)
    .values({
      userId: user.id,
      categoryId: validated.categoryId,
      vendorId: validated.vendorId || null,
      invoiceNumber: validated.invoiceNumber || null,
      amount: validated.amount,
      note: validated.note,
      imageKey: validated.imageKey || null,
      receivedDate: new Date(validated.receivedDate),
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      isRecurring: validated.isRecurring,
      billedTo: validated.billedTo || null,
      status: "unpaid",
    })
    .returning({ id: bills.id });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
  return bill;
}

export async function updateBill(
  id: string,
  data: Partial<{
    categoryId: string;
    vendorId: string | null;
    invoiceNumber?: string | null;
    amount: string;
    note: string | null;
    // null = remove the image; an R2 key = new upload; anything else (e.g. a preview URL) = unchanged
    imageKey: string | null;
    receivedDate: string;
    dueDate: string | null;
    isRecurring: "none" | "daily" | "weekly" | "monthly";
    billedTo: "anchal_sweets" | "anchal_caterers" | null;
  }>
) {
  const user = await getCurrentUser();
  // Validate only the fields being changed (the image is handled separately below)
  const { imageKey, ...rest } = data;
  billSchema.partial().parse(rest);

  const isNewImage = typeof imageKey === "string" && isOwnBillImageKey(imageKey, user.id);
  const imageChanged = imageKey === null || isNewImage;

  const [, , existing] = await Promise.all([
    assertOwnsCategoryAndVendor(user.id, data.categoryId, data.vendorId),
    isNewImage ? assertValidUploadedImage(user.id, imageKey) : null,
    // Remember the old R2 image so it can be deleted once replaced/removed
    imageChanged
      ? db.query.bills.findFirst({
          where: and(eq(bills.id, id), eq(bills.userId, user.id)),
          columns: { imageKey: true },
        })
      : null,
  ]);

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (data.categoryId) updateData.categoryId = data.categoryId;
  if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  if (data.amount) updateData.amount = data.amount;
  if (data.note !== undefined) updateData.note = data.note;
  if (imageChanged) {
    updateData.imageKey = imageKey;
    updateData.imageUrl = null; // drop any legacy base64 copy too
  }
  if (data.receivedDate) updateData.receivedDate = new Date(data.receivedDate);
  if (data.dueDate !== undefined)
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.isRecurring) updateData.isRecurring = data.isRecurring;
  if (data.billedTo !== undefined) updateData.billedTo = data.billedTo;

  const [bill] = await db
    .update(bills)
    .set(updateData)
    .where(and(eq(bills.id, id), eq(bills.userId, user.id)))
    .returning({ id: bills.id });

  if (bill && existing?.imageKey && existing.imageKey !== imageKey) {
    await deleteImages([existing.imageKey]);
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
  return bill;
}

export async function toggleBillStatus(
  id: string,
  paymentMode?: "cash" | "upi" | "cheque" | "net_banking",
  customPaidDate?: string
) {
  const user = await getCurrentUser();

  const bill = await db.query.bills.findFirst({
    where: and(eq(bills.id, id), eq(bills.userId, user.id)),
    columns: { status: true },
  });

  if (!bill) throw new Error("Bill not found");

  const newStatus = bill.status === "paid" ? "unpaid" : "paid";
  const paidDate = newStatus === "paid"
    ? (customPaidDate ? new Date(customPaidDate) : new Date())
    : null;

  const [updated] = await db
    .update(bills)
    .set({
      status: newStatus,
      paidDate,
      paymentMode: newStatus === "paid" ? (paymentMode || null) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(bills.id, id), eq(bills.userId, user.id)))
    .returning({ id: bills.id });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
  return updated;
}

export async function bulkUpdateBillStatus(
  ids: string[],
  status: "paid" | "unpaid",
  paymentMode?: "cash" | "upi" | "cheque" | "net_banking",
  customPaidDate?: string
) {
  const user = await getCurrentUser();
  const paidDate = status === "paid"
    ? (customPaidDate ? new Date(customPaidDate) : new Date())
    : null;

  if (ids.length === 0) return;

  // One statement for all bills (all-or-nothing) instead of one query per bill
  await db
    .update(bills)
    .set({
      status,
      paidDate,
      paymentMode: status === "paid" ? (paymentMode || null) : null,
      updatedAt: new Date(),
    })
    .where(and(inArray(bills.id, ids), eq(bills.userId, user.id)));

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
}

export async function deleteBill(id: string) {
  const user = await getCurrentUser();

  const deleted = await db
    .delete(bills)
    .where(and(eq(bills.id, id), eq(bills.userId, user.id)))
    .returning({ imageKey: bills.imageKey });
  await deleteImages(deleted.map((b) => b.imageKey));

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
}

export async function bulkDeleteBills(ids: string[]) {
  const user = await getCurrentUser();

  if (ids.length === 0) return;

  // One statement for all bills (all-or-nothing) instead of one query per bill
  const deleted = await db
    .delete(bills)
    .where(and(inArray(bills.id, ids), eq(bills.userId, user.id)))
    .returning({ imageKey: bills.imageKey });
  await deleteImages(deleted.map((b) => b.imageKey));

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
}