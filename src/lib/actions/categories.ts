"use server";

import { db } from "@/db";
import { categories, bills, vendors } from "@/db/schema";
import { billColumnsNoImage, hasImageExtra } from "@/db/bill-columns";
import { getCurrentUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validations";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const user = await getCurrentUser();

  const result = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });

  return result;
}

export async function getCategoriesWithStats() {
  const user = await getCurrentUser();

  // Totals are aggregated in the database — only one row per category comes back
  const [cats, billTotals, vendorCounts] = await Promise.all([
    db.query.categories.findMany({
      where: eq(categories.userId, user.id),
      orderBy: (categories, { asc }) => [asc(categories.name)],
    }),
    db
      .select({
        categoryId: bills.categoryId,
        totalBills: sql<number>`count(*)`.mapWith(Number),
        totalAmount: sql<number>`coalesce(sum(${bills.amount}), 0)`.mapWith(Number),
        paidAmount: sql<number>`coalesce(sum(${bills.amount}) filter (where ${bills.status} = 'paid'), 0)`.mapWith(Number),
        unpaidAmount: sql<number>`coalesce(sum(${bills.amount}) filter (where ${bills.status} = 'unpaid'), 0)`.mapWith(Number),
      })
      .from(bills)
      .where(eq(bills.userId, user.id))
      .groupBy(bills.categoryId),
    db
      .select({
        categoryId: vendors.categoryId,
        vendorCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .groupBy(vendors.categoryId),
  ]);

  const totalsByCategory = new Map(billTotals.map((t) => [t.categoryId, t]));
  const vendorsByCategory = new Map(vendorCounts.map((v) => [v.categoryId, v.vendorCount]));

  return cats.map((cat) => {
    const totals = totalsByCategory.get(cat.id);
    return {
      ...cat,
      totalBills: totals?.totalBills ?? 0,
      totalAmount: totals?.totalAmount ?? 0,
      unpaidAmount: totals?.unpaidAmount ?? 0,
      paidAmount: totals?.paidAmount ?? 0,
      vendorCount: vendorsByCategory.get(cat.id) ?? 0,
    };
  });
}

export async function getCategoryById(id: string) {
  const user = await getCurrentUser();

  const result = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, user.id)),
    with: {
      vendors: true,
      bills: {
        // imageUrl deliberately excluded — hasImage tells us if one exists
        columns: billColumnsNoImage,
        extras: hasImageExtra,
        with: {
          vendor: true,
        },
        orderBy: (bills, { desc }) => [desc(bills.receivedDate)],
      },
    },
  });

  if (!result) return result;

  return {
    ...result,
    bills: result.bills.map(({ hasImage, ...b }) => ({
      ...b,
      imageUrl: hasImage ? "has_image" : null,
    })),
  };
}

export async function createCategory(data: { name: string; icon?: string; color?: string }) {
  const user = await getCurrentUser();
  const validated = categorySchema.parse(data);

  const [category] = await db
    .insert(categories)
    .values({
      userId: user.id,
      name: validated.name,
      icon: validated.icon,
      color: validated.color,
    })
    .returning();

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return category;
}

export async function updateCategory(
  id: string,
  data: { name: string; icon?: string; color?: string }
) {
  const user = await getCurrentUser();
  const validated = categorySchema.parse(data);

  const [category] = await db
    .update(categories)
    .set({
      name: validated.name,
      icon: validated.icon,
      color: validated.color,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .returning();

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return category;
}

export async function deleteCategory(id: string) {
  const user = await getCurrentUser();

  // Deleting a category cascades to its bills — collect their R2 images first
  const categoryBills = await db
    .select({ imageKey: bills.imageKey })
    .from(bills)
    .where(and(eq(bills.categoryId, id), eq(bills.userId, user.id)));

  const deleted = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .returning({ id: categories.id });

  if (deleted.length > 0 && categoryBills.some((b) => b.imageKey)) {
    // Loaded only when needed, so ordinary page loads don't pay the AWS SDK's startup cost
    const { deleteImages } = await import("@/lib/r2");
    await deleteImages(categoryBills.map((b) => b.imageKey));
  }

  revalidatePath("/categories");
  revalidatePath("/dashboard");
}