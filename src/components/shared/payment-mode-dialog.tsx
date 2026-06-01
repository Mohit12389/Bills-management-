"use client";

import React, { useState } from "react";
import {
  Banknote,
  Smartphone,
  FileCheck,
  Building2,
  CalendarClock,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PaymentMode = "cash" | "upi" | "cheque" | "net_banking";

interface PaymentModeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: PaymentMode, paidDate: Date) => void;
  billAmount?: string;
}

const PAYMENT_OPTIONS: {
  value: PaymentMode;
  label: string;
  icon: React.ElementType;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    value: "cash",
    label: "Cash",
    icon: Banknote,
    activeColor: "text-emerald-600",
    activeBg: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    value: "upi",
    label: "UPI",
    icon: Smartphone,
    activeColor: "text-violet-600",
    activeBg: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
  },
  {
    value: "cheque",
    label: "Cheque",
    icon: FileCheck,
    activeColor: "text-blue-600",
    activeBg: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  },
  {
    value: "net_banking",
    label: "Net Banking",
    icon: Building2,
    activeColor: "text-orange-600",
    activeBg: "border-orange-500 bg-orange-50 dark:bg-orange-950/30",
  },
];

export function PaymentModeDialog({
  open,
  onClose,
  onConfirm,
  billAmount,
}: PaymentModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<PaymentMode | null>(null);
  const [dateOption, setDateOption] = useState<"now" | "custom">("now");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const handleConfirm = () => {
    if (!selectedMode) return;

    let paidDate: Date;
    if (dateOption === "custom" && customDate) {
      const timeStr = customTime || "12:00";
      paidDate = new Date(`${customDate}T${timeStr}:00`);
    } else {
      paidDate = new Date();
    }

    onConfirm(selectedMode, paidDate);

    // Reset
    setSelectedMode(null);
    setDateOption("now");
    setCustomDate("");
    setCustomTime("");
  };

  const handleClose = () => {
    setSelectedMode(null);
    setDateOption("now");
    setCustomDate("");
    setCustomTime("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            {billAmount
              ? `Bill amount: ${billAmount}`
              : "Select payment details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Payment Mode — 4 options */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = selectedMode === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMode(opt.value)}
                    className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border-2 transition-all ${
                      isSelected
                        ? opt.activeBg
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 ${
                        isSelected ? opt.activeColor : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? opt.activeColor : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Date
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDateOption("now")}
                className={`flex h-14 items-center justify-center gap-2 rounded-lg border-2 transition-all ${
                  dateOption === "now"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Clock
                  className={`h-4 w-4 ${
                    dateOption === "now"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm font-medium">Now</span>
              </button>
              <button
                type="button"
                onClick={() => setDateOption("custom")}
                className={`flex h-14 items-center justify-center gap-2 rounded-lg border-2 transition-all ${
                  dateOption === "custom"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <CalendarClock
                  className={`h-4 w-4 ${
                    dateOption === "custom"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm font-medium">Select Date</span>
              </button>
            </div>

            {dateOption === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="form-group">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="h-9 text-sm"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="form-group">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedMode || (dateOption === "custom" && !customDate)
            }
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== HELPER: Format payment mode for display =====
export function formatPaymentMode(mode: string | null): string {
  if (!mode) return "—";
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    net_banking: "Net Banking",
  };
  return map[mode] || mode;
}

// ===== HELPER: Format billed-to for display =====
export function formatBilledTo(billedTo: string | null): string {
  if (!billedTo) return "—";
  const map: Record<string, string> = {
    anchal_sweets: "Anchal Sweets",
    anchal_caterers: "Anchal Caterers",
    anchal_caterers_original: "Anchal Caterers (original)",
  };
  return map[billedTo] || billedTo;
}