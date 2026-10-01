"use server";

import { db } from "@/db";
import { bills, categories } from "@/db/schema";
import { billColumnsNoImage, hasImageExtra } from "@/db/bill-columns";
import { getCurrentUser } from "@/lib/auth";
import { sortByName } from "@/lib/utils";
import { eq, and, gte, lte, sql, desc, type SQL } from "drizzle-orm";

export interface StatsFilters {
  from?: string;
  to?: string;
  year?: number;
  month?: number;
}

export async function getDashboardStats() {
  const user = await getCurrentUser();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const amount = bills.amount;
  const sumWhere = (condition: SQL) =>
    sql<number>`coalesce(sum(${amount}) filter (where ${condition}), 0)`.mapWith(Number);
  const countWhere = (condition: SQL) =>
    sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

  const isPaid = sql`${bills.status} = 'paid'`;
  const isUnpaid = sql`${bills.status} = 'unpaid'`;
  const isOverdue = sql`${bills.status} = 'unpaid' and ${bills.dueDate} < ${now}`;
  const inThisMonth = sql`${bills.receivedDate} >= ${thisMonthStart} and ${bills.receivedDate} < ${nextMonthStart}`;
  const inLastMonth = sql`${bills.receivedDate} >= ${lastMonthStart} and ${bills.receivedDate} < ${thisMonthStart}`;

  // Everything is aggregated in the database; only summary rows + 5 recent bills come back
  const [[totals], categoryRows, recentBills] = await Promise.all([
    db
      .select({
        totalBills: sql<number>`count(*)`.mapWith(Number),
        totalAmount: sql<number>`coalesce(sum(${amount}), 0)`.mapWith(Number),
        totalPaid: sumWhere(isPaid),
        totalUnpaid: sumWhere(isUnpaid),
        paidCount: countWhere(isPaid),
        unpaidCount: countWhere(isUnpaid),
        overdueCount: countWhere(isOverdue),
        overdueAmount: sumWhere(isOverdue),
        thisMonthTotal: sumWhere(inThisMonth),
        lastMonthTotal: sumWhere(inLastMonth),
      })
      .from(bills)
      .where(eq(bills.userId, user.id)),
    db
      .select({
        name: categories.name,
        color: categories.color,
        total: sql<number>`coalesce(sum(${amount}), 0)`.mapWith(Number),
        paid: sumWhere(isPaid),
        unpaid: sumWhere(isUnpaid),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(bills)
      .innerJoin(categories, eq(bills.categoryId, categories.id))
      .where(eq(bills.userId, user.id))
      .groupBy(categories.id, categories.name, categories.color)
      .orderBy(desc(sql`sum(${amount})`)),
    db.query.bills.findMany({
      where: eq(bills.userId, user.id),
      columns: billColumnsNoImage,
      with: { category: true },
      orderBy: [desc(bills.receivedDate)],
      limit: 5,
    }),
  ]);

  const { thisMonthTotal, lastMonthTotal } = totals;
  const monthOverMonth =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  return {
    ...totals,
    monthOverMonth: Math.round(monthOverMonth * 10) / 10,
    categoryBreakdown: categoryRows.map((c) => ({ ...c, color: c.color || "#6366f1" })),
    recentBills,
  };
}

export async function getStatsData(filters: StatsFilters = {}) {
  const user = await getCurrentUser();

  const conditions = [eq(bills.userId, user.id)];

  if (filters.from) {
    conditions.push(gte(bills.receivedDate, new Date(filters.from)));
  }
  if (filters.to) {
    conditions.push(lte(bills.receivedDate, new Date(filters.to + "T23:59:59")));
  }

  const allBills = await db.query.bills.findMany({
    where: and(...conditions),
    columns: billColumnsNoImage,
    // Check for an image in the DB without transferring the base64 data
    extras: hasImageExtra,
    with: { category: true, vendor: true },
    orderBy: [desc(bills.receivedDate)],
  });

  // Category pie chart data
  const categoryTotals = new Map<string, { name: string; color: string; value: number }>();
  allBills.forEach((b) => {
    if (!b.category) return;
    const key = b.category.id;
    const existing = categoryTotals.get(key) || {
      name: b.category.name,
      color: b.category.color || "#6366f1",
      value: 0,
    };
    existing.value += parseFloat(b.amount);
    categoryTotals.set(key, existing);
  });

  // Monthly bar chart data
  const monthlyData = new Map<string, { month: string; paid: number; unpaid: number; total: number }>();
  allBills.forEach((b) => {
    const d = new Date(b.receivedDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthName = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const existing = monthlyData.get(key) || { month: monthName, paid: 0, unpaid: 0, total: 0 };
    existing.total += parseFloat(b.amount);
    if (b.status === "paid") existing.paid += parseFloat(b.amount);
    else existing.unpaid += parseFloat(b.amount);
    monthlyData.set(key, existing);
  });

  // Vendor breakdown
  const vendorTotals = new Map<string, { name: string; category: string; total: number; unpaid: number }>();
  allBills.forEach((b) => {
    const vendorName = b.vendor?.name || "No Vendor";
    const key = b.vendorId || "no-vendor";
    const existing = vendorTotals.get(key) || {
      name: vendorName,
      category: b.category?.name || "",
      total: 0, unpaid: 0,
    };
    existing.total += parseFloat(b.amount);
    if (b.status === "unpaid") existing.unpaid += parseFloat(b.amount);
    vendorTotals.set(key, existing);
  });

  const totalAmount = allBills.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalPaid = allBills.filter((b) => b.status === "paid").reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalUnpaid = allBills.filter((b) => b.status === "unpaid").reduce((s, b) => s + parseFloat(b.amount), 0);

  return {
    totalAmount,
    totalPaid,
    totalUnpaid,
    totalBills: allBills.length,
    paidCount: allBills.filter((b) => b.status === "paid").length,
    unpaidCount: allBills.filter((b) => b.status === "unpaid").length,
    categoryPieData: Array.from(categoryTotals.values()),
    monthlyBarData: Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v),
    vendorBreakdown: Array.from(vendorTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 15),
    // Bills for export — hasImage flag instead of full base64
    allBills: allBills.map((b) => ({
      id: b.id,
      amount: b.amount,
      status: b.status,
      note: b.note,
      invoiceNumber: b.invoiceNumber || null,
      imageUrl: b.hasImage ? "has_image" : null, // flag only — actual image via /api/bills/image/[id]
      paymentMode: b.paymentMode || null,
      billedTo: b.billedTo || null,
      receivedDate: b.receivedDate,
      paidDate: b.paidDate,
      category: b.category
        ? { id: b.category.id, name: b.category.name, color: b.category.color || "#6366f1" }
        : null,
      vendor: b.vendor
        ? { id: b.vendor.id, name: b.vendor.name }
        : null,
    })),
    categories: sortByName(
      Array.from(categoryTotals.entries()).map(([id, cat]) => ({
        id,
        name: cat.name,
        color: cat.color,
      }))
    ),
    vendors: sortByName(
      Array.from(vendorTotals.entries()).map(([id, v]) => ({
        id,
        name: v.name,
        category: v.category,
      }))
    ),
  };
}