"use server";

import { db } from "@/db";
import { bills, categories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface StatsFilters {
  from?: string;
  to?: string;
  year?: number;
  month?: number;
}

export async function getDashboardStats() {
  const user = await getCurrentUser();

  const allBills = await db.query.bills.findMany({
    where: eq(bills.userId, user.id),
    with: { category: true },
  });

  const now = new Date();
  const thisMonth = allBills.filter((b) => {
    const d = new Date(b.receivedDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const lastMonth = allBills.filter((b) => {
    const d = new Date(b.receivedDate);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const totalAmount = allBills.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalPaid = allBills
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalUnpaid = allBills
    .filter((b) => b.status === "unpaid")
    .reduce((s, b) => s + parseFloat(b.amount), 0);

  const thisMonthTotal = thisMonth.reduce((s, b) => s + parseFloat(b.amount), 0);
  const lastMonthTotal = lastMonth.reduce((s, b) => s + parseFloat(b.amount), 0);

  const monthOverMonth =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  const overdueBills = allBills.filter(
    (b) => b.status === "unpaid" && b.dueDate && new Date(b.dueDate) < now
  );

  const categoryMap = new Map<
    string,
    { name: string; color: string; total: number; paid: number; unpaid: number; count: number }
  >();

  allBills.forEach((b) => {
    const cat = b.category;
    if (!cat) return;
    const existing = categoryMap.get(cat.id) || {
      name: cat.name,
      color: cat.color || "#6366f1",
      total: 0, paid: 0, unpaid: 0, count: 0,
    };
    existing.total += parseFloat(b.amount);
    existing.count += 1;
    if (b.status === "paid") existing.paid += parseFloat(b.amount);
    else existing.unpaid += parseFloat(b.amount);
    categoryMap.set(cat.id, existing);
  });

  const recentBills = allBills
    .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())
    .slice(0, 5);

  return {
    totalAmount,
    totalPaid,
    totalUnpaid,
    totalBills: allBills.length,
    paidCount: allBills.filter((b) => b.status === "paid").length,
    unpaidCount: allBills.filter((b) => b.status === "unpaid").length,
    overdueCount: overdueBills.length,
    overdueAmount: overdueBills.reduce((s, b) => s + parseFloat(b.amount), 0),
    thisMonthTotal,
    lastMonthTotal,
    monthOverMonth: Math.round(monthOverMonth * 10) / 10,
    categoryBreakdown: Array.from(categoryMap.values()),
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
    // Raw bills for export and client-side filtering
    allBills: allBills.map((b) => ({
      id: b.id,
      amount: b.amount,
      status: b.status,
      note: b.note,
      imageUrl: b.imageUrl || null,
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
    categories: Array.from(categoryTotals.entries()).map(([id, cat]) => ({
      id,
      name: cat.name,
      color: cat.color,
    })),
    vendors: Array.from(vendorTotals.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      category: v.category,
    })),
  };
}