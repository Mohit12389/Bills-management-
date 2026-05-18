"use client";

import React, { useState, useMemo } from "react";
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
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Bulk confirmation dialog
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<"paid" | "unpaid">("paid");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNote = bill.note?.toLowerCase().includes(q) || false;
        const matchesCategory = bill.category?.name.toLowerCase().includes(q) || false;
        const matchesVendor = bill.vendor?.name.toLowerCase().includes(q) || false;
        const matchesAmount = bill.amount.includes(q);
        if (!matchesNote && !matchesCategory && !matchesVendor && !matchesAmount) return false;
      }
      return true;
    });
  }, [bills, statusFilter, categoryFilter, dateFrom, dateTo, searchQuery]);

  // ===== COMPUTED =====
  const totalFiltered = displayBills.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalPaid = displayBills.filter((b) => b.status === "paid").reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalUnpaid = displayBills.filter((b) => b.status === "unpaid").reduce((s, b) => s + parseFloat(b.amount), 0);

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
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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
    setEditImage(bill.imageUrl || null);
    setEditDate(bill.receivedDate ? new Date(bill.receivedDate).toISOString().split("T")[0] : "");
    setEditDueDate(bill.dueDate ? new Date(bill.dueDate).toISOString().split("T")[0] : "");
    setEditBilledTo(bill.billedTo || "");
    setEditBillOpen(true);
  };

  const handleEditBillSubmit = async () => {
    if (!editBillId || !editAmount || !editDate) return;
    setEditSubmitting(true);
    try {
      await updateBill(editBillId, {
        amount: editAmount,
        note: editNote || null,
        imageUrl: editImage,
        receivedDate: editDate,
        dueDate: editDueDate || null,
        billedTo: (editBilledTo as any) || null,
      });
      setBills((prev) =>
        prev.map((b) =>
          b.id === editBillId
            ? {
                ...b,
                amount: editAmount,
                note: editNote || null,
                imageUrl: editImage,
                receivedDate: new Date(editDate),
                dueDate: editDueDate ? new Date(editDueDate) : null,
                billedTo: editBilledTo || null,
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
              const count = s === "all" ? bills.length : bills.filter((b) => b.status === s).length;
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
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
              <div className="text-sm">
                <span className="font-semibold">{selectedIds.size} selected</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedPaidCount} paid, {selectedUnpaidCount} unpaid)
                </span>
              </div>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="outline" onClick={handleBulkPaidClick} className="gap-1 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Mark Paid
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkUnpaidClick} className="gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Mark Unpaid
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="gap-1 text-xs">
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
                    <img
                      src={bill.imageUrl}
                      alt="Bill"
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
                      {bill.paymentMode && ` (${formatPaymentMode(bill.paymentMode)})`}
                      {bill.billedTo && ` • ${formatBilledTo(bill.billedTo)}`}
                    </p>
                    {bill.note && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{bill.note}</p>
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
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bill.id)}>
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
      </div>

      {viewingImage && (
        <ImageViewer open={!!viewingImage} onClose={() => setViewingImage(null)} imageUrl={viewingImage} />
      )}

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
                  and won't be changed.
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="form-group">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
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