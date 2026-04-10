"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  MoreVertical,
  ImageIcon,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  StatusBadge,
  EmptyState,
  ImageViewer,
  DateRangePicker,
} from "@/components/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  toggleBillStatus,
  deleteBill,
  bulkUpdateBillStatus,
  bulkDeleteBills,
} from "@/lib/actions/bills";

interface BillWithRelations {
  id: string;
  amount: string;
  note: string | null;
  imageUrl: string | null;
  status: string;
  receivedDate: Date;
  paidDate: Date | null;
  dueDate: Date | null;
  category: { id: string; name: string; color: string | null } | null;
  vendor: { id: string; name: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string | null;
}

export function BillsContent({
  initialBills,
  categories,
}: {
  initialBills: BillWithRelations[];
  categories: CategoryOption[];
}) {
  const [bills, setBills] = useState(initialBills);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ===== ALL FILTERS AS CLIENT STATE =====
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ===== CLIENT-SIDE FILTERING =====
  const displayBills = useMemo(() => {
    return bills.filter((bill) => {
      // Status filter
      if (statusFilter !== "all" && bill.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && bill.category?.id !== categoryFilter) {
        return false;
      }

      // Date from filter
      if (dateFrom) {
        const billDate = new Date(bill.receivedDate);
        const fromDate = new Date(dateFrom);
        if (billDate < fromDate) return false;
      }

      // Date to filter
      if (dateTo) {
        const billDate = new Date(bill.receivedDate);
        const toDate = new Date(dateTo + "T23:59:59");
        if (billDate > toDate) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNote = bill.note?.toLowerCase().includes(q) || false;
        const matchesCategory = bill.category?.name.toLowerCase().includes(q) || false;
        const matchesVendor = bill.vendor?.name.toLowerCase().includes(q) || false;
        const matchesAmount = bill.amount.includes(q);
        if (!matchesNote && !matchesCategory && !matchesVendor && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [bills, statusFilter, categoryFilter, dateFrom, dateTo, searchQuery]);

  // ===== COMPUTED TOTALS =====
  const totalFiltered = displayBills.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalPaid = displayBills
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalUnpaid = displayBills
    .filter((b) => b.status === "unpaid")
    .reduce((s, b) => s + parseFloat(b.amount), 0);

  // ===== SELECTION =====
  const isAllSelected = displayBills.length > 0 && selectedIds.size === displayBills.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayBills.map((b) => b.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ===== ACTIONS =====
  const handleToggleStatus = async (id: string) => {
    try {
      await toggleBillStatus(id);
      setBills((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: b.status === "paid" ? "unpaid" : "paid",
                paidDate: b.status === "unpaid" ? new Date() : null,
              }
            : b
        )
      );
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBill(id);
      setBills((prev) => prev.filter((b) => b.id !== id));
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      toast.success("Bill deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleBulkPaid = async () => {
    try {
      await bulkUpdateBillStatus(Array.from(selectedIds), "paid");
      setBills((prev) =>
        prev.map((b) =>
          selectedIds.has(b.id) ? { ...b, status: "paid", paidDate: new Date() } : b
        )
      );
      toast.success(`${selectedIds.size} bills marked paid`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleBulkUnpaid = async () => {
    try {
      await bulkUpdateBillStatus(Array.from(selectedIds), "unpaid");
      setBills((prev) =>
        prev.map((b) =>
          selectedIds.has(b.id) ? { ...b, status: "unpaid", paidDate: null } : b
        )
      );
      toast.success(`${selectedIds.size} bills marked unpaid`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteBills(Array.from(selectedIds));
      setBills((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      toast.success(`${selectedIds.size} bills deleted`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ===== CLEAR ALL FILTERS =====
  const hasActiveFilters =
    statusFilter !== "all" || categoryFilter !== "all" || dateFrom || dateTo || searchQuery;

  const clearAllFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Bills</h1>
          <p className="page-description">
            Showing {displayBills.length} of {bills.length} bills • Total:{" "}
            {formatCurrency(totalFiltered)}
          </p>
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 lg:hidden"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-3">
          {/* Search + Status filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by note, category, vendor, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            {(["all", "paid", "unpaid"] as const).map((s) => {
              const count =
                s === "all"
                  ? bills.length
                  : bills.filter((b) => b.status === s).length;
              return (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s} ({count})
                </Button>
              );
            })}
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <div className="ml-auto flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkPaid}
                  className="gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Mark Paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkUnpaid}
                  className="gap-1 text-xs"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Mark Unpaid
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="gap-1 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Bill list */}
          {displayBills.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No bills found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters or clearing them"
                  : "Add your first bill to get started"
              }
              actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {/* Header row (desktop) */}
              <div className="hidden items-center gap-4 px-4 py-2 sm:flex">
                <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                <span className="w-16 text-xs font-semibold uppercase text-muted-foreground">
                  Image
                </span>
                <span className="flex-1 text-xs font-semibold uppercase text-muted-foreground">
                  Details
                </span>
                <span className="w-20 text-xs font-semibold uppercase text-muted-foreground">
                  Status
                </span>
                <span className="w-28 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Amount
                </span>
                <span className="w-20" />
              </div>

              {displayBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-4"
                >
                  <Checkbox
                    checked={selectedIds.has(bill.id)}
                    onCheckedChange={() => toggleSelect(bill.id)}
                  />

                  {bill.imageUrl ? (
                    <Image
                      src={bill.imageUrl}
                      alt="Bill"
                      width={64}
                      height={64}
                      className="bill-thumbnail"
                      onClick={() => setViewingImage(bill.imageUrl)}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted sm:h-16 sm:w-16">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {bill.category && (
                        <span
                          className="category-dot shrink-0"
                          style={{ backgroundColor: bill.category.color || "#6366f1" }}
                        />
                      )}
                      <span className="truncate text-sm font-medium">
                        {bill.category?.name || "Uncategorized"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bill.vendor?.name || "No vendor"} • {formatDate(bill.receivedDate)}
                      {bill.paidDate && ` • Paid ${formatDate(bill.paidDate)}`}
                    </p>
                    {bill.note && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                        {bill.note}
                      </p>
                    )}
                  </div>

                  <StatusBadge status={bill.status} dueDate={bill.dueDate} />

                  <span className="w-28 text-right text-sm font-bold tabular-nums">
                    {formatCurrency(bill.amount)}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleStatus(bill.id)}>
                        {bill.status === "unpaid" ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                            Mark Paid
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4 text-amber-600" />
                            Mark Unpaid
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(bill.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== FILTERS SIDEBAR ===== */}
        <div className={`space-y-4 ${showFilters ? "block" : "hidden"} lg:block`}>
          {/* Category filter */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter */}
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onApply={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
            }}
          />

          {/* Summary totals */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </p>
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span className="font-bold tabular-nums">{formatCurrency(totalFiltered)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Paid</span>
              <span className="font-semibold tabular-nums text-emerald-600">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Unpaid</span>
              <span className="font-semibold tabular-nums text-amber-600">
                {formatCurrency(totalUnpaid)}
              </span>
            </div>
            {/* Payment progress bar */}
            <div className="pt-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${totalFiltered > 0 ? (totalPaid / totalFiltered) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {totalFiltered > 0 ? Math.round((totalPaid / totalFiltered) * 100) : 0}% paid
              </p>
            </div>
          </div>
        </div>
      </div>

      {viewingImage && (
        <ImageViewer
          open={!!viewingImage}
          onClose={() => setViewingImage(null)}
          imageUrl={viewingImage}
        />
      )}
    </>
  );
}