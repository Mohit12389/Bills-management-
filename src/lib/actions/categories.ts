"use server";

import { db } from "@/db";
import { categories, bills, vendors } from "@/db/schema";
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

  const result = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    with: {
      bills: true,
      vendors: true,
    },
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });

  return result.map((cat) => ({
    ...cat,
    totalBills: cat.bills.length,
    totalAmount: cat.bills.reduce(
      (sum, b) => sum + parseFloat(b.amount),
      0
    ),
    unpaidAmount: cat.bills
      .filter((b) => b.status === "unpaid")
      .reduce((sum, b) => sum + parseFloat(b.amount), 0),
    paidAmount: cat.bills
      .filter((b) => b.status === "paid")
      .reduce((sum, b) => sum + parseFloat(b.amount), 0),
    vendorCount: cat.vendors.length,
  }));
}

export async function getCategoryById(id: string) {
  const user = await getCurrentUser();

  const result = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, user.id)),
    with: {
      vendors: true,
      bills: {
        with: {
          vendor: true,
        },
        orderBy: (bills, { desc }) => [desc(bills.receivedDate)],
      },
    },
  });

  return result;
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

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  revalidatePath("/categories");
  revalidatePath("/dashboard");
}
