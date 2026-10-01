"use client";

import React, { useState, useMemo, useDeferredValue, useEffect } from "react";
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
  Pencil,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared";
import { updateBill } from "@/lib/actions/bills";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  StatusBadge,
  EmptyState,
  ImageViewer,
  DateRangePicker,
  PaymentModeDialog,
  ConfirmDialog,
} from "@/components/shared";
import { formatPaymentMode, formatBilledTo } from "@/components/shared/payment-mode-dialog";
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
  paymentMode: string | null;
  billedTo: string | null;
  invoiceNumber: string | null;
  receivedDate: Date;
  paidDate: Date | null;
  dueDate: Date | null;
  category: { id: string; name: string; color: string | null } | null;
  vendor: { id: string; name: string } | null;
}

// Rows rendered at a time — totals and "select all" still cover every filtered bill
const PAGE_SIZE = 50;

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

  // Payment mode dialog
  const [paymentModeOpen, setPaymentModeOpen] = useState(false);
  const [pendingPayBillId, setPendingPayBillId] = useState<string | null>(null);
  const [pendingPayAmount, setPendingPayAmount] = useState<string>("");
  const [pendingBulkPay, setPendingBulkPay] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  // Edit bill dialog
  const [editBillOpen, setEditBillOpen] = useState(false);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editBilledTo, setEditBilledTo] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Bulk confirmation dialog
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<"paid" | "unpaid">("paid");

  // Delete confirmation — "bulk" deletes the current selection
  const [deleteTarget, setDeleteTarget] = useState<string | "bulk" | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filtering waits for typing to settle instead of blocking every keystroke
  const deferredSearch = useDeferredValue(searchQuery);

  // ===== CLIENT-SIDE FILTERING =====
  const displayBills = useMemo(() => {
    return bills.filter((bill) => {
      if (statusFilter !== "all" && bill.status !== statusFilter) return false;
      if (categoryFilter !== "all" && bill.category?.id !== categoryFilter) return false;
      if (dateFrom) {
        if (new Date(bill.receivedDate) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        if (new Date(bill.receivedDate) > new Date(dateTo + "T23:59:59")) return false;
      }
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase();
        const matchesNote = bill.note?.toLowerCase().includes(q) || false;
        const matchesCategory = bill.category?.name.toLowerCase().includes(q) || false;
        const matchesVendor = bill.vendor?.name.toLowerCase().includes(q) || false;
        const matchesAmount = bill.amount.includes(q);
        if (!matchesNote && !matchesCategory && !matchesVendor && !matchesAmount) return false;
      }
      return true;
    });
  }, [bills, statusFilter, categoryFilter, dateFrom, dateTo, deferredSearch]);

  // Back to the first page whenever the filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, categoryFilter, dateFrom, dateTo, deferredSearch]);

  const visibleBills = displayBills.slice(0, visibleCount);

  // ===== COMPUTED =====
  const { totalFiltered, totalPaid, totalUnpaid } = useMemo(() => {
    let totalFiltered = 0, totalPaid = 0, totalUnpaid = 0;
    for (const b of displayBills) {
      const amount = parseFloat(b.amount);
      totalFiltered += amount;
      if (b.status === "paid") totalPaid += amount;
      else if (b.status === "unpaid") totalUnpaid += amount;
    }
    return { totalFiltered, totalPaid, totalUnpaid };
  }, [displayBills]);

  const statusCounts = useMemo(() => {
    const counts = { all: bills.length, paid: 0, unpaid: 0 };
    for (const b of bills) {
      if (b.status === "paid") counts.paid++;
      else if (b.status === "unpaid") counts.unpaid++;
    }
    return counts;
  }, [bills]);

  // Bulk selection breakdown
  const selectedBills = bills.filter((b) => selectedIds.has(b.id));
  const selectedPaidCount = selectedBills.filter((b) => b.status === "paid").length;
  const selectedUnpaidCount = selectedBills.filter((b) => b.status === "unpaid").length;

  const isAllSelected = displayBills.length > 0 && selectedIds.size === displayBills.length;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayBills.map((b) => b.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ===== SINGLE BILL: MARK PAID (only for unpaid bills) =====
  const handleMarkPaid = (bill: BillWithRelations) => {
    setPendingPayBillId(bill.id);
    setPendingPayAmount(formatCurrency(bill.amount));
    setPendingBulkPay(false);
    setIsEditingPayment(false);
    setPaymentModeOpen(true);
  };

  // ===== SINGLE BILL: MARK UNPAID =====
  const handleMarkUnpaid = async (id: string) => {
    try {
      await toggleBillStatus(id);
      setBills((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "unpaid", paidDate: null, paymentMode: null } : b
        )
      );
      toast.success("Marked as unpaid");
    } catch {
      toast.error("Failed to update");
    }
  };

  // ===== SINGLE BILL: EDIT PAYMENT DETAILS (only for paid bills) =====
  const handleEditPayment = (bill: BillWithRelations) => {
    setPendingPayBillId(bill.id);
    setPendingPayAmount(formatCurrency(bill.amount));
    setPendingBulkPay(false);
    setIsEditingPayment(true);
    setPaymentModeOpen(true);
  };

  // ===== PAYMENT MODE CONFIRM (single + bulk + edit) =====
  const handlePaymentModeConfirm = async (
    mode: "cash" | "upi" | "cheque" | "net_banking",
    paidDate: Date
  ) => {
    setPaymentModeOpen(false);
    const dateStr = paidDate.toISOString();

    if (pendingBulkPay) {
      try {
        await bulkUpdateBillStatus(Array.from(selectedIds), "paid", mode, dateStr);
        setBills((prev) =>
          prev.map((b) =>
            selectedIds.has(b.id)
              ? { ...b, status: "paid", paidDate: paidDate, paymentMode: mode }
              : b
          )
        );
        toast.success(`${selectedIds.size} bills marked paid (${formatPaymentMode(mode)})`);
        setSelectedIds(new Set());
      } catch {
        toast.error("Failed to update");
      }
    } else if (pendingPayBillId) {
      try {
        await toggleBillStatus(pendingPayBillId, mode, dateStr);
        setBills((prev) =>
          prev.map((b) =>
            b.id === pendingPayBillId
              ? { ...b, status: "paid", paidDate: paidDate, paymentMode: mode }
              : b
          )
        );
        toast.success(
          isEditingPayment
            ? `Payment details updated (${formatPaymentMode(mode)})`
            : `Marked as paid (${formatPaymentMode(mode)})`
        );
      } catch {
        toast.error("Failed to update");
      }
    }

    setPendingPayBillId(null);
    setPendingPayAmount("");
    setPendingBulkPay(false);
    setIsEditingPayment(false);
  };

  // ===== BULK: MARK PAID (with confirmation) =====
  const handleBulkPaidClick = () => {
    setBulkConfirmAction("paid");
    setBulkConfirmOpen(true);
  };

  const handleBulkPaidConfirm = () => {
    setBulkConfirmOpen(false);
    setPendingBulkPay(true);
    setPendingPayAmount(`${selectedIds.size} bills`);
    setIsEditingPayment(false);
    setPaymentModeOpen(true);
  };

  // ===== BULK: MARK UNPAID (with confirmation) =====
  const handleBulkUnpaidClick = () => {
    setBulkConfirmAction("unpaid");
    setBulkConfirmOpen(true);
  };

  const handleBulkUnpaidConfirm = async () => {
    setBulkConfirmOpen(false);
    try {
      await bulkUpdateBillStatus(Array.from(selectedIds), "unpaid");
      setBills((prev) =>
        prev.map((b) =>
          selectedIds.has(b.id) ? { ...b, status: "unpaid", paidDate: null, paymentMode: null } : b
        )
      );
      toast.success(`${selectedIds.size} bills marked unpaid`);
      setSelectedIds(new Set());
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

  const hasActiveFilters =
    statusFilter !== "all" || categoryFilter !== "all" || dateFrom || dateTo || searchQuery;

  const clearAllFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  // ===== EDIT BILL =====
  const openEditBill = (bill: BillWithRelations) => {
    setEditBillId(bill.id);
    setEditAmount(bill.amount);
    setEditNote(bill.note || "");
    // List data only carries a "has_image" flag — preview the real image via the API route
    setEditImage(bill.imageUrl ? `/api/bills/image/${bill.id}` : null);
    setEditDate(bill.receivedDate ? new Date(bill.receivedDate).toISOString().split("T")[0] : "");
    setEditDueDate(bill.dueDate ? new Date(bill.dueDate).toISOString().split("T")[0] : "");
    setEditBilledTo(bill.billedTo || "");
    setEditInvoiceNumber(bill.invoiceNumber || "");
    setEditBillOpen(true);
  };

  const handleEditBillSubmit = async () => {
    if (!editBillId || !editAmount || !editDate) return;
    setEditSubmitting(true);
    try {
      await updateBill(editBillId, {
        amount: editAmount,
        note: editNote || null,
        imageKey: editImage,
        receivedDate: editDate,
        dueDate: editDueDate || null,
        billedTo: (editBilledTo as any) || null,
        invoiceNumber: editInvoiceNumber || null,
      });
      setBills((prev) =>
        prev.map((b) =>
          b.id === editBillId
            ? {
                ...b,
                amount: editAmount,
                note: editNote || null,
                imageUrl: editImage ? "has_image" : null,
                receivedDate: new Date(editDate),
                dueDate: editDueDate ? new Date(editDueDate) : null,
                billedTo: editBilledTo || null,
                invoiceNumber: editInvoiceNumber || null,
              }
            : b
        )
      );
      setEditBillOpen(false);
      toast.success("Bill updated");
    } catch {
      toast.error("Failed to update bill");
    } finally {
      setEditSubmitting(false);
    }
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
        {/* ===== FILTERS SIDEBAR (shows at top on mobile, right side on desktop) ===== */}
        <div className={`space-y-4 ${showFilters ? "block" : "hidden"} lg:block lg:order-2`}>
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onApply={(from, to) => { setDateFrom(from); setDateTo(to); }}
            onClear={() => { setDateFrom(""); setDateTo(""); }}
          />

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span className="font-bold tabular-nums">{formatCurrency(totalFiltered)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Paid</span>
              <span className="font-semibold tabular-nums text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Unpaid</span>
              <span className="font-semibold tabular-nums text-amber-600">{formatCurrency(totalUnpaid)}</span>
            </div>
            <div className="pt-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${totalFiltered > 0 ? (totalPaid / totalFiltered) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {totalFiltered > 0 ? Math.round((totalPaid / totalFiltered) * 100) : 0}% paid
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 lg:order-1 space-y-3">
          {/* Search + Status filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by note, category, vendor, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 text-sm sm:h-9"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
            {(["all", "paid", "unpaid"] as const).map((s) => {
              const count = statusCounts[s];
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
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
              <div className="text-sm">
                <span className="font-semibold">{selectedIds.size} selected</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedPaidCount} paid, {selectedUnpaidCount} unpaid)
                </span>
              </div>
              <div className="flex w-full flex-wrap gap-1.5 sm:ml-auto sm:w-auto">
                <Button size="sm" variant="outline" onClick={handleBulkPaidClick} className="gap-1 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Mark Paid
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkUnpaidClick} className="gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Mark Unpaid
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget("bulk")} className="gap-1 text-xs">
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
              description={hasActiveFilters ? "Try adjusting your filters or clearing them" : "Add your first bill to get started"}
              actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {/* Header row (desktop) */}
              <div className="hidden items-center gap-4 px-4 py-2 sm:flex">
                <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                <span className="w-16 text-xs font-semibold uppercase text-muted-foreground">Image</span>
                <span className="flex-1 text-xs font-semibold uppercase text-muted-foreground">Details</span>
                <span className="w-20 text-xs font-semibold uppercase text-muted-foreground">Status</span>
                <span className="w-28 text-right text-xs font-semibold uppercase text-muted-foreground">Amount</span>
                <span className="w-8" />
              </div>

              {visibleBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 sm:items-center sm:gap-4 sm:px-4"
                >
                  {/* Bigger tap area around the checkbox on phones */}
                  <label className="-m-2 flex shrink-0 cursor-pointer p-2 sm:m-0 sm:p-0">
                    <Checkbox
                      checked={selectedIds.has(bill.id)}
                      onCheckedChange={() => toggleSelect(bill.id)}
                      className="mt-0.5 h-5 w-5 sm:mt-0 sm:h-4 sm:w-4"
                    />
                  </label>

                  {/* Thumbnail — desktop only; phones get a "Photo" chip under the details */}
                  {bill.imageUrl ? (
                    <button
                      type="button"
                      className="hidden h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-emerald-50 sm:flex"
                      onClick={() => setViewingImage(`/api/bills/image/${bill.id}`)}
                    >
                      <ImageIcon className="h-5 w-5 text-emerald-600" />
                    </button>
                  ) : (
                    <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted sm:flex">
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
                      <span className="min-w-0 truncate text-sm font-medium">
                        {bill.category?.name || "Uncategorized"}
                      </span>
                      <span className="ml-auto shrink-0 pl-2 text-sm font-bold tabular-nums sm:hidden">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">
                      {bill.vendor?.name || "No vendor"} • {formatDate(bill.receivedDate)}
                      {bill.paidDate && ` • Paid ${formatDate(bill.paidDate)}`}
                      {bill.paymentMode && ` (${formatPaymentMode(bill.paymentMode)})`}
                      {bill.billedTo && ` • ${formatBilledTo(bill.billedTo)}`}
                    </p>
                    {bill.invoiceNumber && (
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">Invoice: {bill.invoiceNumber}</p>
                    )}
                    {bill.note && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{bill.note}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 sm:hidden">
                      <StatusBadge status={bill.status} dueDate={bill.dueDate} />
                      {bill.imageUrl && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          onClick={() => setViewingImage(`/api/bills/image/${bill.id}`)}
                        >
                          <ImageIcon className="h-3 w-3" />
                          Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="hidden w-20 shrink-0 sm:block">
                    <StatusBadge status={bill.status} dueDate={bill.dueDate} />
                  </div>

                  <span className="hidden w-28 shrink-0 text-right text-sm font-bold tabular-nums sm:block">
                    {formatCurrency(bill.amount)}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-9 w-9 shrink-0 sm:m-0 sm:h-8 sm:w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Edit bill — available for both paid and unpaid */}
                      <DropdownMenuItem onClick={() => openEditBill(bill)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Bill
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Status toggle */}
                      {bill.status === "unpaid" ? (
                        <DropdownMenuItem onClick={() => handleMarkPaid(bill)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                          Mark Paid
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => handleEditPayment(bill)}>
                            <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                            Edit Payment Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkUnpaid(bill.id)}>
                            <Clock className="mr-2 h-4 w-4 text-amber-600" />
                            Mark Unpaid
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(bill.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {displayBills.length > visibleCount && (
                <div className="flex justify-center p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    Show more ({displayBills.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {viewingImage && (
        <ImageViewer open={!!viewingImage} onClose={() => setViewingImage(null)} imageUrl={viewingImage} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget === "bulk" ? `Delete ${selectedIds.size} bills?` : "Delete this bill?"}
        description="This permanently deletes the bill and its image. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget === "bulk") handleBulkDelete();
          else if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />

      {/* Payment Mode Dialog */}
      <PaymentModeDialog
        open={paymentModeOpen}
        onClose={() => {
          setPaymentModeOpen(false);
          setPendingPayBillId(null);
          setPendingBulkPay(false);
          setIsEditingPayment(false);
        }}
        onConfirm={handlePaymentModeConfirm}
        billAmount={pendingPayAmount}
      />

      {/* ===== BULK CONFIRMATION DIALOG ===== */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkConfirmAction === "paid" ? "Mark Bills as Paid" : "Mark Bills as Unpaid"}
            </DialogTitle>
            <DialogDescription>
              Review the selection before proceeding
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total selected</span>
                <span className="font-bold">{selectedIds.size} bills</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Already paid</span>
                <span className="font-semibold text-emerald-600">{selectedPaidCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Currently unpaid</span>
                <span className="font-semibold text-amber-600">{selectedUnpaidCount}</span>
              </div>
            </div>

            {bulkConfirmAction === "paid" && selectedPaidCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                  ⚠ {selectedPaidCount} bill{selectedPaidCount > 1 ? "s are" : " is"} already paid.
                  Their payment mode and date will be updated with the new values you choose.
                </p>
              </div>
            )}

            {bulkConfirmAction === "unpaid" && selectedUnpaidCount > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                  ℹ {selectedUnpaidCount} bill{selectedUnpaidCount > 1 ? "s are" : " is"} already unpaid
                  and won&apos;t be changed.
                </p>
              </div>
            )}

            {bulkConfirmAction === "unpaid" && selectedPaidCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                  ⚠ {selectedPaidCount} paid bill{selectedPaidCount > 1 ? "s" : ""} will lose their
                  payment mode and payment date.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={
                bulkConfirmAction === "paid"
                  ? handleBulkPaidConfirm
                  : handleBulkUnpaidConfirm
              }
            >
              {bulkConfirmAction === "paid"
                ? `Mark ${selectedIds.size} Bills Paid`
                : `Mark ${selectedPaidCount} Bill${selectedPaidCount > 1 ? "s" : ""} Unpaid`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT BILL DIALOG ===== */}
      <Dialog open={editBillOpen} onOpenChange={(open) => { setEditBillOpen(open); if (!open) setEditBillId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="form-group">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <Label>Invoice Number</Label>
              <Input
                placeholder="e.g., INV-2024-001 (optional)"
                value={editInvoiceNumber}
                onChange={(e) => setEditInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <Label>Billed To</Label>
              <Select value={editBilledTo} onValueChange={setEditBilledTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subsidiary" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anchal_sweets">Anchal Sweets</SelectItem>
                  <SelectItem value="anchal_caterers">Anchal Caterers</SelectItem>
                  <SelectItem value="anchal_caterers_original">Anchal Caterers (original) </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <Label>Received Date *</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <Label>Note</Label>
              <Textarea
                placeholder="Optional note..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="form-group">
              <Label>Bill Image</Label>
              <ImageUpload value={editImage} onChange={setEditImage} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBillOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditBillSubmit}
              disabled={editSubmitting || !editAmount || !editDate}
            >
              {editSubmitting ? "Saving..." : "Update Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}