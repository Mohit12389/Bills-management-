"use server";

import { db } from "@/db";
import { bills, categories, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { billSchema } from "@/lib/validations";
import { eq, and, gte, lte, desc, asc, sql, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  if (categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
      columns: { id: true },
    });
    if (!category) throw new Error("Category not found");
  }
  if (vendorId) {
    const vendor = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, vendorId), eq(vendors.userId, userId)),
      columns: { id: true },
    });
    if (!vendor) throw new Error("Vendor not found");
  }
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
    page = 1,
    limit = 10000,
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

  const result = await db.query.bills.findMany({
    where: and(...conditions),
    with: {
      category: true,
      vendor: true,
    },
    orderBy: [desc(bills.createdAt)],
    // limit,
    // offset: (page - 1) * limit,
    // No limit — all bills loaded, filtered client-side
  });

  // Strip full base64 image data — replace with hasImage flag
  // Images are loaded on-demand via /api/bills/image/[id]
  return result.map((bill) => ({
    ...bill,
    imageUrl: bill.imageUrl ? "has_image" : null,
  }));
}

export async function getBillById(id: string) {
  const user = await getCurrentUser();

  return db.query.bills.findFirst({
    where: and(eq(bills.id, id), eq(bills.userId, user.id)),
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
  imageUrl?: string | null;
  receivedDate: string;
  dueDate?: string | null;
  isRecurring?: "none" | "daily" | "weekly" | "monthly";
  billedTo?: "anchal_sweets" | "anchal_caterers" | null;
}) {
  const user = await getCurrentUser();
  const validated = billSchema.parse(data);
  await assertOwnsCategoryAndVendor(user.id, validated.categoryId, validated.vendorId);

  const [bill] = await db
    .insert(bills)
    .values({
      userId: user.id,
      categoryId: validated.categoryId,
      vendorId: validated.vendorId || null,
      invoiceNumber: validated.invoiceNumber || null,
      amount: validated.amount,
      note: validated.note,
      imageUrl: validated.imageUrl,
      receivedDate: new Date(validated.receivedDate),
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      isRecurring: validated.isRecurring,
      billedTo: validated.billedTo || null,
      status: "unpaid",
    })
    .returning();

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
    imageUrl: string | null;
    receivedDate: string;
    dueDate: string | null;
    isRecurring: "none" | "daily" | "weekly" | "monthly";
    billedTo: "anchal_sweets" | "anchal_caterers" | null;
  }>
) {
  const user = await getCurrentUser();
  // Validate only the fields being changed (the image is handled separately below)
  const { imageUrl: _image, ...rest } = data;
  billSchema.omit({ imageUrl: true }).partial().parse(rest);
  await assertOwnsCategoryAndVendor(user.id, data.categoryId, data.vendorId);

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (data.categoryId) updateData.categoryId = data.categoryId;
  if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  if (data.amount) updateData.amount = data.amount;
  if (data.note !== undefined) updateData.note = data.note;
  // Only overwrite the stored image with a new upload (data: URL) or an explicit removal (null).
  // Anything else (e.g. the "has_image" flag or a /api/bills/image preview URL) means "unchanged".
  if (data.imageUrl === null || data.imageUrl?.startsWith("data:")) {
    updateData.imageUrl = data.imageUrl;
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
    .returning();

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
    .returning();

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

  for (const id of ids) {
    await db
      .update(bills)
      .set({
        status,
        paidDate,
        paymentMode: status === "paid" ? (paymentMode || null) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(bills.id, id), eq(bills.userId, user.id)));
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
}

export async function deleteBill(id: string) {
  const user = await getCurrentUser();

  await db
    .delete(bills)
    .where(and(eq(bills.id, id), eq(bills.userId, user.id)));

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
}

export async function bulkDeleteBills(ids: string[]) {
  const user = await getCurrentUser();

  for (const id of ids) {
    await db
      .delete(bills)
      .where(and(eq(bills.id, id), eq(bills.userId, user.id)));
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/categories");
  revalidatePath("/stats");
}