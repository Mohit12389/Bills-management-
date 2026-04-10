"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

interface ReportBill {
  amount: string;
  status: string;
  note: string | null;
  receivedDate: Date;
  paidDate: Date | null;
  category?: { name: string } | null;
  vendor?: { name: string } | null;
}

interface ReportCategoryBreakdown {
  name: string;
  total: number;
  paid: number;
  unpaid: number;
}

interface ReportData {
  title: string;
  dateRange?: string;
  bills: ReportBill[];
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  categoryBreakdown: ReportCategoryBreakdown[];
}

// ===== EXPORT AS CSV (opens in Excel) =====
export function exportToCSV(data: ReportData) {
  const headers = [
    "Date Received",
    "Category",
    "Vendor",
    "Amount",
    "Status",
    "Date Paid",
    "Note",
  ];

  const rows = data.bills.map((bill) => [
    formatDate(bill.receivedDate),
    bill.category?.name || "Uncategorized",
    bill.vendor?.name || "No vendor",
    bill.amount,
    bill.status.toUpperCase(),
    bill.paidDate ? formatDate(bill.paidDate) : "",
    (bill.note || "").replace(/,/g, ";"),
  ]);

  // Add summary section
  rows.push([]);
  rows.push(["", "", "", "", "", "", ""]);
  rows.push(["SUMMARY", "", "", "", "", "", ""]);
  rows.push(["Total Amount", "", "", data.totalAmount.toString(), "", "", ""]);
  rows.push(["Total Paid", "", "", data.totalPaid.toString(), "", "", ""]);
  rows.push(["Total Unpaid", "", "", data.totalUnpaid.toString(), "", "", ""]);
  rows.push([]);
  rows.push(["CATEGORY BREAKDOWN", "", "", "", "", "", ""]);
  rows.push(["Category", "Total", "Paid", "Unpaid", "", "", ""]);
  data.categoryBreakdown.forEach((cat) => {
    rows.push([
      cat.name,
      cat.total.toString(),
      cat.paid.toString(),
      cat.unpaid.toString(),
      "",
      "",
      "",
    ]);
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  downloadFile(csvContent, `${data.title.replace(/\s+/g, "_")}.csv`, "text/csv");
}

// ===== EXPORT AS PRINTABLE PDF (via browser print) =====
export function exportToPrintablePDF(data: ReportData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1a1a1a; font-size: 12px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e5651f; padding-bottom: 16px; }
    .header h1 { font-size: 22px; color: #e5651f; margin-bottom: 4px; }
    .header p { color: #666; font-size: 11px; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary-card { flex: 1; background: #f8f8f8; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .summary-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .summary-card.paid .value { color: #16a34a; }
    .summary-card.unpaid .value { color: #d97706; }
    .section-title { font-size: 14px; font-weight: 600; margin: 20px 0 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f5f0eb; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5e5e5; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
    tr:hover td { background: #fafafa; }
    .amount { font-weight: 600; text-align: right; font-family: monospace; font-size: 12px; }
    .status-paid { color: #16a34a; font-weight: 600; font-size: 10px; }
    .status-unpaid { color: #d97706; font-weight: 600; font-size: 10px; }
    .category-table th { background: #e5651f; color: white; }
    .total-row td { font-weight: 700; border-top: 2px solid #333; background: #f8f8f8; }
    .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; color: #999; font-size: 10px; }
    @media print { body { padding: 12px; } .summary-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>MithaiBills — Monthly Report</h1>
    <p>${data.title}${data.dateRange ? " • " + data.dateRange : ""}</p>
    <p>Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Bills</div>
      <div class="value">${formatCurrency(data.totalAmount)}</div>
      <div class="label">${data.bills.length} bills</div>
    </div>
    <div class="summary-card paid">
      <div class="label">Paid</div>
      <div class="value">${formatCurrency(data.totalPaid)}</div>
    </div>
    <div class="summary-card unpaid">
      <div class="label">Unpaid</div>
      <div class="value">${formatCurrency(data.totalUnpaid)}</div>
    </div>
  </div>

  ${data.categoryBreakdown.length > 0 ? `
  <div class="section-title">Category Breakdown</div>
  <table class="category-table">
    <thead>
      <tr>
        <th>Category</th>
        <th style="text-align:right">Total</th>
        <th style="text-align:right">Paid</th>
        <th style="text-align:right">Unpaid</th>
      </tr>
    </thead>
    <tbody>
      ${data.categoryBreakdown.map((cat) => `
      <tr>
        <td>${cat.name}</td>
        <td class="amount">${formatCurrency(cat.total)}</td>
        <td class="amount" style="color:#16a34a">${formatCurrency(cat.paid)}</td>
        <td class="amount" style="color:#d97706">${formatCurrency(cat.unpaid)}</td>
      </tr>`).join("")}
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="amount">${formatCurrency(data.totalAmount)}</td>
        <td class="amount" style="color:#16a34a">${formatCurrency(data.totalPaid)}</td>
        <td class="amount" style="color:#d97706">${formatCurrency(data.totalUnpaid)}</td>
      </tr>
    </tbody>
  </table>
  ` : ""}

  <div class="section-title">All Bills</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Vendor</th>
        <th style="text-align:right">Amount</th>
        <th>Status</th>
        <th>Paid On</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${data.bills.map((bill) => `
      <tr>
        <td>${formatDate(bill.receivedDate)}</td>
        <td>${bill.category?.name || "—"}</td>
        <td>${bill.vendor?.name || "—"}</td>
        <td class="amount">${formatCurrency(bill.amount)}</td>
        <td class="${bill.status === "paid" ? "status-paid" : "status-unpaid"}">${bill.status.toUpperCase()}</td>
        <td>${bill.paidDate ? formatDate(bill.paidDate) : "—"}</td>
        <td>${bill.note || "—"}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="footer">
    MithaiBills — Sweet Shop Bill Manager • This report was auto-generated
  </div>
</body>
</html>`;

  // Open in new window and trigger print
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for content to render, then print
    printWindow.onload = () => {
      printWindow.print();
    };
    // Fallback if onload doesn't fire
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

// ===== HELPER =====
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}