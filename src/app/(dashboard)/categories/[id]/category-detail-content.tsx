"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Users,
  Receipt,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  ImageIcon,
  Phone,
  MapPin,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { StatusBadge, EmptyState, ImageUpload, ImageViewer, DateRangePicker, PaymentModeDialog } from "@/components/shared";
import { formatPaymentMode, formatBilledTo } from "@/components/shared/payment-mode-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createVendor, updateVendor, deleteVendor } from "@/lib/actions/vendors";
import { createBill, updateBill, toggleBillStatus, deleteBill } from "@/lib/actions/bills";

interface BillItem {
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
  vendor: { id: string; name: string } | null;
}

interface VendorItem {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface CategoryDetail {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  vendors: VendorItem[];
  bills: BillItem[];
}

export function CategoryDetailContent({ category }: { category: CategoryDetail }) {
  // ===== DIALOG STATES =====
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentModeOpen, setPaymentModeOpen] = useState(false);
  const [pendingPayBillId, setPendingPayBillId] = useState<string | null>(null);
  const [pendingPayAmount, setPendingPayAmount] = useState<string>("");

  // ===== EDIT TRACKING =====
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  // ===== FILTER STATES =====
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // ===== VENDOR FORM =====
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  // ===== BILL FORM =====
  const [billAmount, setBillAmount] = useState("");
  const [billNote, setBillNote] = useState("");
  const [billImage, setBillImage] = useState<string | null>(null);
  const [billVendor, setBillVendor] = useState<string>("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [billDueDate, setBillDueDate] = useState("");
  const [billBilledTo, setBillBilledTo] = useState<string>("");

  // ===== HELPERS =====
  const resetBillForm = () => {
    setBillAmount("");
    setBillNote("");
    setBillImage(null);
    setBillVendor("");
    setBillDate(new Date().toISOString().split("T")[0]);
    setBillDueDate("");
    setBillBilledTo("");
    setEditingBillId(null);
  };

  const resetVendorForm = () => {
    setVendorName("");
    setVendorPhone("");
    setVendorAddress("");
    setEditingVendorId(null);
  };

  const formatDateForInput = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
  };

  // ===== OPEN EDIT BILL DIALOG =====
  const openEditBill = (bill: BillItem) => {
    setEditingBillId(bill.id);
    setBillAmount(bill.amount);
    setBillNote(bill.note || "");
    setBillImage(bill.imageUrl || null);
    setBillVendor(bill.vendor?.id || "");
    setBillDate(formatDateForInput(bill.receivedDate));
    setBillDueDate(formatDateForInput(bill.dueDate));
    setBillBilledTo(bill.billedTo || "");
    setBillDialogOpen(true);
  };

  // ===== OPEN ADD BILL DIALOG =====
  const openAddBill = () => {
    resetBillForm();
    setBillDialogOpen(true);
  };

  // ===== OPEN EDIT VENDOR DIALOG =====
  const openEditVendor = (vendor: VendorItem) => {
    setEditingVendorId(vendor.id);
    setVendorName(vendor.name);
    setVendorPhone(vendor.phone || "");
    setVendorAddress(vendor.address || "");
    setVendorDialogOpen(true);
  };

  // ===== OPEN ADD VENDOR DIALOG =====
  const openAddVendor = () => {
    resetVendorForm();
    setVendorDialogOpen(true);
  };

  // ===== FILTER BILLS =====
  const filteredBills = category.bills.filter((bill) => {
    if (statusFilter !== "all" && bill.status !== statusFilter) return false;
    if (dateRange.from) {
      const rd = new Date(bill.receivedDate);
      if (rd < new Date(dateRange.from)) return false;
    }
    if (dateRange.to) {
      const rd = new Date(bill.receivedDate);
      if (rd > new Date(dateRange.to + "T23:59:59")) return false;
    }
    return true;
  });

  const filteredTotal = filteredBills.reduce((s, b) => s + parseFloat(b.amount), 0);
  const filteredPaid = filteredBills
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + parseFloat(b.amount), 0);
  const filteredUnpaid = filteredBills
    .filter((b) => b.status === "unpaid")
    .reduce((s, b) => s + parseFloat(b.amount), 0);

  // ===== VENDOR SUBMIT (ADD / EDIT) =====
  const handleVendorSubmit = async () => {
    if (!vendorName.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingVendorId) {
        await updateVendor(editingVendorId, {
          name: vendorName.trim(),
          categoryId: category.id,
          phone: vendorPhone || null,
          address: vendorAddress || null,
        });
        toast.success("Vendor updated");
      } else {
        await createVendor({
          name: vendorName.trim(),
          categoryId: category.id,
          phone: vendorPhone || null,
          address: vendorAddress || null,
        });
        toast.success("Vendor added");
      }
      setVendorDialogOpen(false);
      resetVendorForm();
      window.location.reload();
    } catch (error) {
      toast.error(editingVendorId ? "Failed to update vendor" : "Failed to add vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== BILL SUBMIT (ADD / EDIT) =====
  const handleBillSubmit = async () => {
    if (!billAmount || !billDate) return;
    setIsSubmitting(true);
    try {
      if (editingBillId) {
        await updateBill(editingBillId, {
          categoryId: category.id,
          vendorId: billVendor || null,
          amount: billAmount,
          note: billNote || null,
          imageUrl: billImage,
          receivedDate: billDate,
          dueDate: billDueDate || null,
          billedTo: (billBilledTo as any) || null,
        });
        toast.success("Bill updated");
      } else {
        await createBill({
          categoryId: category.id,
          vendorId: billVendor || null,
          amount: billAmount,
          note: billNote || null,
          imageUrl: billImage,
          receivedDate: billDate,
          dueDate: billDueDate || null,
          billedTo: (billBilledTo as any) || null,
        });
        toast.success("Bill added");
      }
      setBillDialogOpen(false);
      resetBillForm();
      window.location.reload();
    } catch (error) {
      toast.error(editingBillId ? "Failed to update bill" : "Failed to add bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (billId: string, billAmount?: string) => {
    const bill = category.bills.find((b) => b.id === billId);
    if (!bill) return;

    if (bill.status === "unpaid") {
      setPendingPayBillId(billId);
      setPendingPayAmount(billAmount || "");
      setPaymentModeOpen(true);
    } else {
      try {
        await toggleBillStatus(billId);
        toast.success("Marked as unpaid");
        window.location.reload();
      } catch (error) {
        toast.error("Failed to update status");
      }
    }
  };

  const handlePaymentModeConfirm = async (mode: "cash" | "upi" | "cheque" | "net_banking", paidDate: Date) => {
    if (!pendingPayBillId) return;
    setPaymentModeOpen(false);
    try {
      await toggleBillStatus(pendingPayBillId, mode, paidDate.toISOString());
      toast.success(`Marked as paid (${formatPaymentMode(mode)})`);
      setPendingPayBillId(null);
      setPendingPayAmount("");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      await deleteBill(billId);
      toast.success("Bill deleted");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to delete bill");
    }
  };

  const handleDuplicateBill = async (bill: BillItem) => {
    try {
      await createBill({
        categoryId: category.id,
        vendorId: bill.vendor?.id || null,
        amount: bill.amount,
        note: bill.note || null,
        imageUrl: null,
        receivedDate: new Date().toISOString().split("T")[0],
        dueDate: null,
        billedTo: (bill.billedTo as any) || null,
      });
      toast.success("Bill duplicated with today's date");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to duplicate bill");
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      await deleteVendor(vendorId);
      toast.success("Vendor deleted");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to delete vendor");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/categories">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="category-dot"
                style={{ backgroundColor: category.color || "#6366f1" }}
              />
              <h1 className="page-title">{category.name}</h1>
            </div>
            <p className="page-description">
              {category.vendors.length} vendors • {category.bills.length} bills
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAddVendor} className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Add Vendor</span>
          </Button>
          <Button onClick={openAddBill} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Bill</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Bills
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Vendors
          </TabsTrigger>
        </TabsList>

        {/* ===== BILLS TAB ===== */}
        <TabsContent value="bills" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3">
              {/* Status filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(["all", "paid", "unpaid"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                    className="capitalize"
                  >
                    {s === "all" ? `All (${category.bills.length})` : `${s} (${category.bills.filter(b => b.status === s).length})`}
                  </Button>
                ))}
              </div>

              {/* Bill list */}
              {filteredBills.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No bills found"
                  description={
                    statusFilter !== "all"
                      ? "Try changing the filter"
                      : "Add your first bill for this category"
                  }
                  actionLabel="Add Bill"
                  onAction={openAddBill}
                />
              ) : (
                <div className="divide-y rounded-lg border bg-card">
                  {filteredBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:p-4"
                    >
                      {/* Bill image thumbnail */}
                        {bill.imageUrl ? (
  <div
    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-md border bg-emerald-50 sm:h-16 sm:w-16"
    onClick={() => setViewingImage(`/api/bills/image/${bill.id}`)}
  >
    <ImageIcon className="h-5 w-5 text-emerald-600" />
  </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted sm:h-16 sm:w-16">
                          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* Bill info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(bill.amount)}
                          </span>
                          <StatusBadge status={bill.status} dueDate={bill.dueDate} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bill.vendor?.name || "No vendor"} •{" "}
                          Received {formatDate(bill.receivedDate)}
                          {bill.paidDate && ` • Paid ${formatDate(bill.paidDate)}`}
                          {bill.paymentMode && ` (${formatPaymentMode(bill.paymentMode)})`}
                          {bill.billedTo && ` • ${formatBilledTo(bill.billedTo)}`}
                        </p>
                        {bill.note && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                            {bill.note}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => handleToggleStatus(bill.id, formatCurrency(bill.amount))}
                        >
                          {bill.status === "unpaid" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Mark Paid</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Mark Unpaid</span>
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditBill(bill)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateBill(bill)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate Bill
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteBill(bill.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Date filter & Subtotals */}
            <div className="space-y-4">
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onApply={(from, to) => setDateRange({ from, to })}
                onClear={() => setDateRange({})}
              />

              <div className="rounded-lg border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subtotals
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <span className="font-bold tabular-nums">{formatCurrency(filteredTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Paid</span>
                    <span className="font-semibold tabular-nums text-emerald-600">
                      {formatCurrency(filteredPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600">Unpaid</span>
                    <span className="font-semibold tabular-nums text-amber-600">
                      {formatCurrency(filteredUnpaid)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${filteredTotal > 0 ? (filteredPaid / filteredTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== VENDORS TAB ===== */}
        <TabsContent value="vendors">
          {category.vendors.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No vendors yet"
              description="Add vendors that supply to this category"
              actionLabel="Add Vendor"
              onAction={openAddVendor}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.vendors.map((vendor) => {
                const vendorBills = category.bills.filter(
                  (b) => b.vendor?.id === vendor.id
                );
                const vendorTotal = vendorBills.reduce(
                  (s, b) => s + parseFloat(b.amount), 0
                );
                const vendorUnpaid = vendorBills
                  .filter((b) => b.status === "unpaid")
                  .reduce((s, b) => s + parseFloat(b.amount), 0);

                return (
                  <div
                    key={vendor.id}
                    className="group rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditVendor(vendor)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Vendor
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteVendor(vendor.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {vendor.phone && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {vendor.phone}
                      </p>
                    )}
                    {vendor.address && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {vendor.address}
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                        <p className="text-sm font-bold tabular-nums">
                          {formatCurrency(vendorTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-amber-600">Unpaid</p>
                        <p className="text-sm font-bold tabular-nums text-amber-600">
                          {formatCurrency(vendorUnpaid)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== VENDOR DIALOG (ADD / EDIT) ===== */}
      <Dialog
        open={vendorDialogOpen}
        onOpenChange={(open) => {
          setVendorDialogOpen(open);
          if (!open) resetVendorForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVendorId ? "Edit Vendor" : `Add Vendor to ${category.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="form-group">
              <Label>Vendor Name *</Label>
              <Input
                placeholder="e.g., Amul Distributor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <Label>Phone</Label>
              <Input
                placeholder="Optional"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <Label>Address</Label>
              <Input
                placeholder="Optional"
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVendorDialogOpen(false);
                resetVendorForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVendorSubmit}
              disabled={isSubmitting || !vendorName.trim()}
            >
              {isSubmitting
                ? "Saving..."
                : editingVendorId
                ? "Update Vendor"
                : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== BILL DIALOG (ADD / EDIT) ===== */}
      <Dialog
        open={billDialogOpen}
        onOpenChange={(open) => {
          setBillDialogOpen(open);
          if (!open) resetBillForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBillId ? "Edit Bill" : `Add Bill to ${category.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="form-group">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
              />
            </div>

            {category.vendors.length > 0 && (
              <div className="form-group">
                <Label>Vendor</Label>
                <Select value={billVendor} onValueChange={setBillVendor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {category.vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Billed To */}
            <div className="form-group">
              <Label>Billed To</Label>
              <Select value={billBilledTo} onValueChange={setBillBilledTo}>
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
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <Label>Note</Label>
              <Textarea
                placeholder="Optional note about this bill..."
                value={billNote}
                onChange={(e) => setBillNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="form-group">
              <Label>Bill Image</Label>
              <ImageUpload value={billImage} onChange={setBillImage} />
              <p className="text-[10px] text-muted-foreground">
                {editingBillId
                  ? "Upload a new image or remove the existing one"
                  : "Images are auto-compressed to save storage"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBillDialogOpen(false);
                resetBillForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBillSubmit}
              disabled={isSubmitting || !billAmount || !billDate}
            >
              {isSubmitting
                ? "Saving..."
                : editingBillId
                ? "Update Bill"
                : "Add Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      {viewingImage && (
        <ImageViewer
          open={!!viewingImage}
          onClose={() => setViewingImage(null)}
          imageUrl={viewingImage}
          title={`${category.name} - Bill`}
        />
      )}

      {/* Payment Mode Dialog */}
      <PaymentModeDialog
        open={paymentModeOpen}
        onClose={() => {
          setPaymentModeOpen(false);
          setPendingPayBillId(null);
        }}
        onConfirm={handlePaymentModeConfirm}
        billAmount={pendingPayAmount}
      />
    </>
  );
}