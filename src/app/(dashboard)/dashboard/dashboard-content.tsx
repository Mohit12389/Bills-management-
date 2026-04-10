"use client";

import React from "react";
import Link from "next/link";
import {
  IndianRupee,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { StatCard, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardStats {
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  totalBills: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  overdueAmount: number;
  thisMonthTotal: number;
  lastMonthTotal: number;
  monthOverMonth: number;
  categoryBreakdown: {
    name: string;
    color: string;
    total: number;
    paid: number;
    unpaid: number;
    count: number;
  }[];
  recentBills: any[];
}

export function DashboardContent({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Bills"
          value={formatCurrency(stats.totalAmount)}
          subtitle={`${stats.totalBills} bills`}
          icon={IndianRupee}
          className="animate-fade-in stagger-1"
        />
        <StatCard
          label="Paid"
          value={formatCurrency(stats.totalPaid)}
          subtitle={`${stats.paidCount} bills`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          className="animate-fade-in stagger-2"
        />
        <StatCard
          label="Unpaid"
          value={formatCurrency(stats.totalUnpaid)}
          subtitle={`${stats.unpaidCount} bills`}
          icon={Receipt}
          iconColor="text-amber-600"
          className="animate-fade-in stagger-3"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(stats.thisMonthTotal)}
          icon={TrendingUp}
          trend={
            stats.lastMonthTotal > 0
              ? {
                  value: stats.monthOverMonth,
                  label: "vs last month",
                }
              : undefined
          }
          className="animate-fade-in stagger-4"
        />
      </div>

      {/* Overdue Alert */}
      {stats.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400">
              {stats.overdueCount} overdue bill{stats.overdueCount > 1 ? "s" : ""} totaling{" "}
              {formatCurrency(stats.overdueAmount)}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              These bills have passed their due date
            </p>
          </div>
          <Link href="/bills?status=unpaid">
            <Button variant="outline" size="sm" className="border-red-300 text-red-700">
              View
            </Button>
          </Link>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category Pie Chart */}
        <Card className="animate-fade-in stagger-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryBreakdown.length > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-48 sm:h-56 sm:w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={3}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {stats.categoryBreakdown.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {stats.categoryBreakdown.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="category-dot"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Add bills to see category breakdown
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card className="animate-fade-in stagger-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Bills</CardTitle>
            <Link href="/bills">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentBills.length > 0 ? (
              <div className="space-y-3">
                {stats.recentBills.map((bill: any) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: bill.category?.color || "#6366f1",
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {bill.category?.name || "Uncategorized"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(bill.receivedDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={bill.status} dueDate={bill.dueDate} />
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No bills yet. Add your first bill to get started!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Cards */}
      {stats.categoryBreakdown.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Category Summary</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.categoryBreakdown.map((cat, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="category-dot"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-semibold">{cat.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {cat.count} bills
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Paid</span>
                    <span className="tabular-nums">{formatCurrency(cat.paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600">Unpaid</span>
                    <span className="tabular-nums">{formatCurrency(cat.unpaid)}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${cat.total > 0 ? (cat.paid / cat.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {cat.total > 0 ? Math.round((cat.paid / cat.total) * 100) : 0}% paid
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
