"use server";

import { db } from "@/db";
import { vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { vendorSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getVendorsByCategory(categoryId: string) {
  const user = await getCurrentUser();

  return db.query.vendors.findMany({
    where: and(
      eq(vendors.userId, user.id),
      eq(vendors.categoryId, categoryId)
    ),
    orderBy: (vendors, { asc }) => [asc(vendors.name)],
  });
}

export async function getAllVendors() {
  const user = await getCurrentUser();

  return db.query.vendors.findMany({
    where: eq(vendors.userId, user.id),
    with: { category: true },
    orderBy: (vendors, { asc }) => [asc(vendors.name)],
  });
}

export async function createVendor(data: {
  name: string;
  categoryId: string;
  phone?: string | null;
  address?: string | null;
}) {
  const user = await getCurrentUser();
  const validated = vendorSchema.parse(data);

  const [vendor] = await db
    .insert(vendors)
    .values({
      userId: user.id,
      categoryId: validated.categoryId,
      name: validated.name,
      phone: validated.phone,
      address: validated.address,
    })
    .returning();

  revalidatePath("/categories");
  return vendor;
}

export async function updateVendor(
  id: string,
  data: {
    name: string;
    categoryId: string;
    phone?: string | null;
    address?: string | null;
  }
) {
  const user = await getCurrentUser();
  const validated = vendorSchema.parse(data);

  const [vendor] = await db
    .update(vendors)
    .set({
      name: validated.name,
      phone: validated.phone,
      address: validated.address,
      updatedAt: new Date(),
    })
    .where(and(eq(vendors.id, id), eq(vendors.userId, user.id)))
    .returning();

  revalidatePath("/categories");
  return vendor;
}

export async function deleteVendor(id: string) {
  const user = await getCurrentUser();

  await db
    .delete(vendors)
    .where(and(eq(vendors.id, id), eq(vendors.userId, user.id)));

  revalidatePath("/categories");
}
