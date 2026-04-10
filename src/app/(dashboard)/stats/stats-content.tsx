"use client";

import React, { useState, useMemo } from "react";
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  Receipt,
  Download,
  FileText,
  FileSpreadsheet,
  X,
  Filter,
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StatCard, DateRangePicker } from "@/components/shared";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV, exportToPrintablePDF } from "@/lib/export-report";

interface BillForStats {
  amount: string;
  status: string;
  note: string | null;
  receivedDate: Date;
  paidDate: Date | null;
  category: { id: string; name: string; color: string } | null;
  vendor: { id: string; name: string } | null;
}

interface StatsData {
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  totalBills: number;
  paidCount: number;
  unpaidCount: number;
  categoryPieData: { name: string; color: string; value: number }[];
  monthlyBarData: { month: string; paid: number; unpaid: number; total: number }[];
  vendorBreakdown: { name: string; category: string; total: number; unpaid: number }[];
  allBills: BillForStats[];
  categories: { id: string; name: string; color: string }[];
  vendors: { id: string; name: string; category: string }[];
}

export function StatsContent({
  stats,
  initialFrom,
  initialTo,
}: {
  stats: StatsData;
  initialFrom?: string;
  initialTo?: string;
}) {
  // ===== FILTER STATES =====
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(initialFrom || "");
  const [dateTo, setDateTo] = useState(initialTo || "");

  // ===== CLIENT-SIDE FILTERING =====
  const filteredBills = useMemo(() => {
    return stats.allBills.filter((bill) => {
      if (categoryFilter !== "all" && bill.category?.id !== categoryFilter) return false;
      if (vendorFilter !== "all") {
        if (vendorFilter === "no-vendor" && bill.vendor !== null) return false;
        if (vendorFilter !== "no-vendor" && bill.vendor?.id !== vendorFilter) return false;
      }
      if (dateFrom) {
        if (new Date(bill.receivedDate) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        if (new Date(bill.receivedDate) > new Date(dateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [stats.allBills, categoryFilter, vendorFilter, dateFrom, dateTo]);

  // ===== COMPUTED STATS FROM FILTERED BILLS =====
  const computed = useMemo(() => {
    const totalAmount = filteredBills.reduce((s, b) => s + parseFloat(b.amount), 0);
    const totalPaid = filteredBills.filter((b) => b.status === "paid").reduce((s, b) => s + parseFloat(b.amount), 0);
    const totalUnpaid = filteredBills.filter((b) => b.status === "unpaid").reduce((s, b) => s + parseFloat(b.amount), 0);

    // Category pie data
    const catMap = new Map<string, { name: string; color: string; value: number }>();
    filteredBills.forEach((b) => {
      if (!b.category) return;
      const existing = catMap.get(b.category.id) || { name: b.category.name, color: b.category.color, value: 0 };
      existing.value += parseFloat(b.amount);
      catMap.set(b.category.id, existing);
    });

    // Monthly bar data
    const monthMap = new Map<string, { month: string; paid: number; unpaid: number; total: number }>();
    filteredBills.forEach((b) => {
      const d = new Date(b.receivedDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthName = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const existing = monthMap.get(key) || { month: monthName, paid: 0, unpaid: 0, total: 0 };
      existing.total += parseFloat(b.amount);
      if (b.status === "paid") existing.paid += parseFloat(b.amount);
      else existing.unpaid += parseFloat(b.amount);
      monthMap.set(key, existing);
    });

    // Vendor breakdown
    const vendorMap = new Map<string, { name: string; category: string; total: number; unpaid: number }>();
    filteredBills.forEach((b) => {
      const vName = b.vendor?.name || "No Vendor";
      const key = b.vendor?.id || "no-vendor";
      const existing = vendorMap.get(key) || { name: vName, category: b.category?.name || "", total: 0, unpaid: 0 };
      existing.total += parseFloat(b.amount);
      if (b.status === "unpaid") existing.unpaid += parseFloat(b.amount);
      vendorMap.set(key, existing);
    });

    return {
      totalAmount,
      totalPaid,
      totalUnpaid,
      totalBills: filteredBills.length,
      paidCount: filteredBills.filter((b) => b.status === "paid").length,
      unpaidCount: filteredBills.filter((b) => b.status === "unpaid").length,
      categoryPieData: Array.from(catMap.values()),
      monthlyBarData: Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
      vendorBreakdown: Array.from(vendorMap.values()).sort((a, b) => b.total - a.total).slice(0, 15),
    };
  }, [filteredBills]);

  // ===== VENDORS FILTERED BY SELECTED CATEGORY =====
  const filteredVendors = useMemo(() => {
    if (categoryFilter === "all") return stats.vendors;
    const catName = stats.categories.find((c) => c.id === categoryFilter)?.name;
    return stats.vendors.filter((v) => v.category === catName);
  }, [stats.vendors, stats.categories, categoryFilter]);

  const paidPercentage = computed.totalAmount > 0 ? Math.round((computed.totalPaid / computed.totalAmount) * 100) : 0;

  const hasActiveFilters = categoryFilter !== "all" || vendorFilter !== "all" || dateFrom || dateTo;

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setVendorFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // ===== EXPORT =====
  const getReportData = () => {
    const catLabel = categoryFilter !== "all"
      ? stats.categories.find((c) => c.id === categoryFilter)?.name || ""
      : "All Categories";
    const vendorLabel = vendorFilter !== "all" && vendorFilter !== "no-vendor"
      ? stats.vendors.find((v) => v.id === vendorFilter)?.name || ""
      : vendorFilter === "no-vendor" ? "No Vendor" : "All Vendors";
    const dateLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "All Time";

    return {
      title: `Bill Report — ${catLabel} — ${vendorLabel}`,
      dateRange: dateLabel,
      bills: filteredBills,
      totalAmount: computed.totalAmount,
      totalPaid: computed.totalPaid,
      totalUnpaid: computed.totalUnpaid,
      categoryBreakdown: computed.categoryPieData.map((cat) => ({
        name: cat.name,
        total: cat.value,
        paid: 0,
        unpaid: 0,
      })),
    };
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistics</h1>
          <p className="page-description">
            {hasActiveFilters
              ? `Filtered: ${computed.totalBills} bills • ${formatCurrency(computed.totalAmount)}`
              : "Spending insights and payment analytics"}
          </p>
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Report</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToPrintablePDF(getReportData())} className="gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                Export as PDF (Print)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(getReportData())} className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export as CSV (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===== FILTERS ROW ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Category Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <Select
            value={categoryFilter}
            onValueChange={(val) => {
              setCategoryFilter(val);
              setVendorFilter("all"); // Reset vendor when category changes
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {stats.categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vendor Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vendor
          </label>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              <SelectItem value="no-vendor">No Vendor</SelectItem>
              {filteredVendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Quick date presets */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "This Month", action: () => {
            const now = new Date();
            setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
            setDateTo(now.toISOString().split("T")[0]);
          }},
          { label: "Last Month", action: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            setDateFrom(start.toISOString().split("T")[0]);
            setDateTo(end.toISOString().split("T")[0]);
          }},
          { label: "Last 3 Months", action: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            setDateFrom(start.toISOString().split("T")[0]);
            setDateTo(now.toISOString().split("T")[0]);
          }},
          { label: "This Year", action: () => {
            const now = new Date();
            setDateFrom(`${now.getFullYear()}-01-01`);
            setDateTo(now.toISOString().split("T")[0]);
          }},
          { label: "All Time", action: () => { setDateFrom(""); setDateTo(""); }},
        ].map((preset) => (
          <Button key={preset.label} variant="outline" size="sm" className="h-7 text-xs" onClick={preset.action}>
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Amount"
          value={formatCurrency(computed.totalAmount)}
          subtitle={`${computed.totalBills} bills`}
          icon={IndianRupee}
          className="animate-fade-in stagger-1"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(computed.totalPaid)}
          subtitle={`${computed.paidCount} bills`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          className="animate-fade-in stagger-2"
        />
        <StatCard
          label="Total Unpaid"
          value={formatCurrency(computed.totalUnpaid)}
          subtitle={`${computed.unpaidCount} bills`}
          icon={Clock}
          iconColor="text-amber-600"
          className="animate-fade-in stagger-3"
        />
        <StatCard
          label="Payment Rate"
          value={`${paidPercentage}%`}
          subtitle="bills paid"
          icon={Receipt}
          iconColor="text-primary"
          className="animate-fade-in stagger-4"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {computed.categoryPieData.length > 0 ? (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-56 w-56 sm:h-64 sm:w-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={computed.categoryPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {computed.categoryPieData.map((entry, index) => (
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
                <div className="flex-1 space-y-3">
                  {computed.categoryPieData.map((cat, i) => {
                    const percent = computed.totalAmount > 0 ? Math.round((cat.value / computed.totalAmount) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="category-dot" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-semibold tabular-nums">{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(cat.value)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No data for the selected filters</p>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {computed.monthlyBarData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.monthlyBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" iconSize={8} />
                    <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="unpaid" name="Unpaid" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No data for the selected filters</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendor Breakdown Table */}
      {computed.vendorBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Unpaid</th>
                    <th className="w-32">% of Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.vendorBreakdown.map((vendor, i) => {
                    const percent = computed.totalAmount > 0 ? Math.round((vendor.total / computed.totalAmount) * 100) : 0;
                    return (
                      <tr key={i}>
                        <td className="font-medium">{vendor.name}</td>
                        <td className="text-muted-foreground">{vendor.category}</td>
                        <td className="text-right font-semibold tabular-nums">{formatCurrency(vendor.total)}</td>
                        <td className="text-right tabular-nums text-amber-600">{formatCurrency(vendor.unpaid)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Progress value={percent} className="h-2" />
                            <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}