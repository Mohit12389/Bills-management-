import React from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { isOverdue } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  dueDate?: Date | string | null;
}

export function StatusBadge({ status, dueDate }: StatusBadgeProps) {
  if (status === "paid") {
    return (
      <span className="badge-paid">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  }

  if (isOverdue(dueDate ?? null, status)) {
    return (
      <span className="badge-overdue">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  return (
    <span className="badge-unpaid">
      <Clock className="h-3 w-3" />
      Unpaid
    </span>
  );
}
