import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isAfter } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateShort(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yy");
}

export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isOverdue(dueDate: Date | string | null, status: string): boolean {
  if (!dueDate || status === "paid") return false;
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return isAfter(new Date(), d);
}

export function getStatusColor(status: string): string {
  return status === "paid" ? "success" : "warning";
}

export function compressImageSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Category icon options
export const CATEGORY_ICONS = [
  "Package",
  "Milk",
  "Apple",
  "Beef",
  "Cookie",
  "Coffee",
  "Wine",
  "Wheat",
  "Nut",
  "Candy",
  "IceCream",
  "Carrot",
  "Egg",
  "Fish",
  "Flame",
  "Droplets",
  "Box",
  "Truck",
  "Store",
  "ShoppingBag",
] as const;

// Category color options
export const CATEGORY_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#f43f5e", // rose
] as const;
