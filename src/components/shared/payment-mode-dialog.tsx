"use client";

import React, { useState } from "react";
import { Banknote, Smartphone, CalendarClock, Clock } from "lucide-react";
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

interface PaymentModeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: "cash" | "online", paidDate: Date) => void;
  billAmount?: string;
}

export function PaymentModeDialog({
  open,
  onClose,
  onConfirm,
  billAmount,
}: PaymentModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<"cash" | "online" | null>(null);
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

    // Reset state
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
            {billAmount ? `Bill amount: ${billAmount}` : "Select payment details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Payment Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMode("cash")}
                className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border-2 transition-all ${
                  selectedMode === "cash"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-border hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <Banknote
                  className={`h-7 w-7 ${
                    selectedMode === "cash" ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    selectedMode === "cash" ? "text-emerald-700" : "text-foreground"
                  }`}
                >
                  Cash
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("online")}
                className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border-2 transition-all ${
                  selectedMode === "online"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-border hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <Smartphone
                  className={`h-7 w-7 ${
                    selectedMode === "online" ? "text-blue-600" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    selectedMode === "online" ? "text-blue-700" : "text-foreground"
                  }`}
                >
                  Online
                </span>
              </button>
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
                    dateOption === "now" ? "text-primary" : "text-muted-foreground"
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
                    dateOption === "custom" ? "text-primary" : "text-muted-foreground"
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
            disabled={!selectedMode || (dateOption === "custom" && !customDate)}
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}