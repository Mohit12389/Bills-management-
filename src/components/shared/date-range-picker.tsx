"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onApply: (from: string, to: string) => void;
  onClear?: () => void;
}

export function DateRangePicker({
  from,
  to,
  onApply,
  onClear,
}: DateRangePickerProps) {
  const [fromDate, setFromDate] = useState(from || "");
  const [toDate, setToDate] = useState(to || "");

  const handleApply = () => {
    if (fromDate && toDate) {
      onApply(fromDate, toDate);
    }
  };

  // Preset ranges
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFromDate(format(start, "yyyy-MM-dd"));
    setToDate(format(end, "yyyy-MM-dd"));
  };

  const setMonthPreset = (monthsAgo: number) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end =
      monthsAgo === 0
        ? now
        : new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    setFromDate(format(start, "yyyy-MM-dd"));
    setToDate(format(end, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        Date Range
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "7d", action: () => setPreset(7) },
          { label: "30d", action: () => setPreset(30) },
          { label: "90d", action: () => setPreset(90) },
          { label: "This Month", action: () => setMonthPreset(0) },
          { label: "Last Month", action: () => setMonthPreset(1) },
          { label: "This Year", action: () => {
            const now = new Date();
            setFromDate(format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd"));
            setToDate(format(now, "yyyy-MM-dd"));
          }},
        ].map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={preset.action}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="form-group">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleApply} className="flex-1">
          Apply
        </Button>
        {onClear && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFromDate("");
              setToDate("");
              onClear();
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
