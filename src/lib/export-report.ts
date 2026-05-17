"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentMode, formatBilledTo } from "@/components/shared/payment-mode-dialog";

interface ReportBill {
  id?: string;
  amount: string;
  status: string;
  note: string | null;
  imageUrl?: string | null;
  paymentMode?: string | null;
  billedTo?: string | null;
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

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function getBillImageUrl(billId: string): string {
  return `${getBaseUrl()}/api/bills/image/${billId}`;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ===== EXPORT AS CSV =====
export function exportToCSV(data: ReportData) {
  const headers = [
    "Date Received",
    "Category",
    "Vendor",
    "Billed To",
    "Amount",
    "Status",
    "Payment Mode",
    "Date Paid",
    "Note",
    "Bill Image URL",
  ];

  const rows = data.bills.map((bill) =>
    [
      formatDate(bill.receivedDate),
      bill.category?.name || "Uncategorized",
      bill.vendor?.name || "No vendor",
      formatBilledTo(bill.billedTo || null),
      bill.amount,
      bill.status.toUpperCase(),
      bill.status === "paid" ? formatPaymentMode(bill.paymentMode || null) : "",
      bill.paidDate ? formatDate(bill.paidDate) : "",
      bill.note || "",
      bill.imageUrl && bill.id ? getBillImageUrl(bill.id) : "No image",
    ].map(csvEscape).join(",")
  );

  // Payment mode counts
  const cashCount = data.bills.filter((b) => b.paymentMode === "cash").length;
  const upiCount = data.bills.filter((b) => b.paymentMode === "upi").length;
  const chequeCount = data.bills.filter((b) => b.paymentMode === "cheque").length;
  const netBankingCount = data.bills.filter((b) => b.paymentMode === "net_banking").length;

  const cashTotal = data.bills.filter((b) => b.paymentMode === "cash").reduce((s, b) => s + parseFloat(b.amount), 0);
  const upiTotal = data.bills.filter((b) => b.paymentMode === "upi").reduce((s, b) => s + parseFloat(b.amount), 0);
  const chequeTotal = data.bills.filter((b) => b.paymentMode === "cheque").reduce((s, b) => s + parseFloat(b.amount), 0);
  const netBankingTotal = data.bills.filter((b) => b.paymentMode === "net_banking").reduce((s, b) => s + parseFloat(b.amount), 0);

  // Billed To counts
  const sweetsCount = data.bills.filter((b) => b.billedTo === "anchal_sweets").length;
  const caterersCount = data.bills.filter((b) => b.billedTo === "anchal_caterers").length;
  const sweetsTotal = data.bills.filter((b) => b.billedTo === "anchal_sweets").reduce((s, b) => s + parseFloat(b.amount), 0);
  const caterersTotal = data.bills.filter((b) => b.billedTo === "anchal_caterers").reduce((s, b) => s + parseFloat(b.amount), 0);

  const summaryRows = [
    "",
    "SUMMARY,,,,,,,,,",
    `Total Amount,,,,,${csvEscape(formatCurrency(data.totalAmount))},,,,`,
    `Total Paid,,,,,${csvEscape(formatCurrency(data.totalPaid))},,,,`,
    `Total Unpaid,,,,,${csvEscape(formatCurrency(data.totalUnpaid))},,,,`,
    `Total Bills,,,,,${data.bills.length},,,,`,
    "",
    "PAYMENT MODE BREAKDOWN,,,,,,,,,",
    `Cash,,,,,${cashCount} bills,${csvEscape(formatCurrency(cashTotal))},,,`,
    `UPI,,,,,${upiCount} bills,${csvEscape(formatCurrency(upiTotal))},,,`,
    `Cheque,,,,,${chequeCount} bills,${csvEscape(formatCurrency(chequeTotal))},,,`,
    `Net Banking,,,,,${netBankingCount} bills,${csvEscape(formatCurrency(netBankingTotal))},,,`,
    "",
    "BILLED TO BREAKDOWN,,,,,,,,,",
    `Anchal Sweets,,,,,${sweetsCount} bills,${csvEscape(formatCurrency(sweetsTotal))},,,`,
    `Anchal Caterers,,,,,${caterersCount} bills,${csvEscape(formatCurrency(caterersTotal))},,,`,
  ];

  const categoryRows: string[] = [""];
  if (data.categoryBreakdown.length > 0) {
    categoryRows.push("CATEGORY BREAKDOWN,,,,,,,,,");
    categoryRows.push("Category,Total,Paid,Unpaid,,,,,,,");
    data.categoryBreakdown.forEach((cat) => {
      categoryRows.push(
        `${csvEscape(cat.name)},${csvEscape(formatCurrency(cat.total))},${csvEscape(formatCurrency(cat.paid))},${csvEscape(formatCurrency(cat.unpaid))},,,,,,,`
      );
    });
  }

  const csvContent = [headers.join(","), ...rows, ...summaryRows, ...categoryRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== EXPORT AS PDF =====
export function exportToPrintablePDF(data: ReportData) {
  const cashTotal = data.bills.filter((b) => b.paymentMode === "cash").reduce((s, b) => s + parseFloat(b.amount), 0);
  const upiTotal = data.bills.filter((b) => b.paymentMode === "upi").reduce((s, b) => s + parseFloat(b.amount), 0);
  const chequeTotal = data.bills.filter((b) => b.paymentMode === "cheque").reduce((s, b) => s + parseFloat(b.amount), 0);
  const netBankingTotal = data.bills.filter((b) => b.paymentMode === "net_banking").reduce((s, b) => s + parseFloat(b.amount), 0);

  const sweetsTotal = data.bills.filter((b) => b.billedTo === "anchal_sweets").reduce((s, b) => s + parseFloat(b.amount), 0);
  const caterersTotal = data.bills.filter((b) => b.billedTo === "anchal_caterers").reduce((s, b) => s + parseFloat(b.amount), 0);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1a1a1a; font-size: 11px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e5651f; padding-bottom: 16px; }
    .header h1 { font-size: 22px; color: #e5651f; margin-bottom: 4px; }
    .header p { color: #666; font-size: 11px; }
    .summary { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-card { flex: 1; min-width: 70px; background: #f8f8f8; border-radius: 8px; padding: 8px; text-align: center; }
    .summary-card .label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }
    .summary-card .value { font-size: 13px; font-weight: 700; margin-top: 2px; }
    .summary-card.paid .value { color: #16a34a; }
    .summary-card.unpaid .value { color: #d97706; }
    .summary-card.cash .value { color: #059669; }
    .summary-card.upi .value { color: #7c3aed; }
    .summary-card.cheque .value { color: #2563eb; }
    .summary-card.netbank .value { color: #ea580c; }
    .summary-card.sweets .value { color: #e5651f; }
    .summary-card.caterers .value { color: #0891b2; }
    .section-title { font-size: 13px; font-weight: 600; margin: 16px 0 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f5f0eb; text-align: left; padding: 5px 6px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5e5e5; }
    td { padding: 5px 6px; border-bottom: 1px solid #f0f0f0; font-size: 9px; vertical-align: middle; }
    .amount { font-weight: 600; text-align: right; font-family: monospace; font-size: 10px; }
    .status-paid { color: #16a34a; font-weight: 600; }
    .status-unpaid { color: #d97706; font-weight: 600; }
    .mode-cash { color: #059669; }
    .mode-upi { color: #7c3aed; }
    .mode-cheque { color: #2563eb; }
    .mode-netbank { color: #ea580c; }
    .billed-sweets { color: #e5651f; font-weight: 500; }
    .billed-caterers { color: #0891b2; font-weight: 500; }
    .category-table th { background: #e5651f; color: white; }
    .total-row td { font-weight: 700; border-top: 2px solid #333; background: #f8f8f8; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; color: #999; font-size: 9px; }
    .img-link { color: #e5651f; text-decoration: none; font-weight: 600; font-size: 8px; border: 1px solid #e5651f; padding: 1px 5px; border-radius: 3px; }
    .no-img { color: #ccc; font-size: 8px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>MithaiBills — Report</h1>
    <p>${data.title}${data.dateRange ? " • " + data.dateRange : ""}</p>
    <p>Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Total</div>
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
    <div class="summary-card cash">
      <div class="label">Cash</div>
      <div class="value">${formatCurrency(cashTotal)}</div>
    </div>
    <div class="summary-card upi">
      <div class="label">UPI</div>
      <div class="value">${formatCurrency(upiTotal)}</div>
    </div>
    <div class="summary-card cheque">
      <div class="label">Cheque</div>
      <div class="value">${formatCurrency(chequeTotal)}</div>
    </div>
    <div class="summary-card netbank">
      <div class="label">Net Banking</div>
      <div class="value">${formatCurrency(netBankingTotal)}</div>
    </div>
  </div>
  <div class="summary">
    <div class="summary-card sweets">
      <div class="label">Anchal Sweets</div>
      <div class="value">${formatCurrency(sweetsTotal)}</div>
    </div>
    <div class="summary-card caterers">
      <div class="label">Anchal Caterers</div>
      <div class="value">${formatCurrency(caterersTotal)}</div>
    </div>
  </div>

  ${data.categoryBreakdown.length > 0 ? `
  <div class="section-title">Category Breakdown</div>
  <table class="category-table">
    <thead><tr><th>Category</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Unpaid</th></tr></thead>
    <tbody>
      ${data.categoryBreakdown.map((cat) => `<tr><td>${cat.name}</td><td class="amount">${formatCurrency(cat.total)}</td><td class="amount" style="color:#16a34a">${formatCurrency(cat.paid)}</td><td class="amount" style="color:#d97706">${formatCurrency(cat.unpaid)}</td></tr>`).join("")}
      <tr class="total-row"><td>TOTAL</td><td class="amount">${formatCurrency(data.totalAmount)}</td><td class="amount" style="color:#16a34a">${formatCurrency(data.totalPaid)}</td><td class="amount" style="color:#d97706">${formatCurrency(data.totalUnpaid)}</td></tr>
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
        <th>Billed To</th>
        <th style="text-align:right">Amount</th>
        <th>Status</th>
        <th>Mode</th>
        <th>Paid On</th>
        <th>Note</th>
        <th>Image</th>
      </tr>
    </thead>
    <tbody>
      ${data.bills.map((bill) => {
        const imageCell = bill.imageUrl && bill.id
          ? `<a href="${getBillImageUrl(bill.id)}" target="_blank" class="img-link">View</a>`
          : `<span class="no-img">—</span>`;

        const modeMap: Record<string, string> = { cash: "mode-cash", upi: "mode-upi", cheque: "mode-cheque", net_banking: "mode-netbank" };
        const modeClass = bill.paymentMode ? (modeMap[bill.paymentMode] || "") : "";
        const modeText = bill.status === "paid" ? formatPaymentMode(bill.paymentMode || null) : "";

        const billedClass = bill.billedTo === "anchal_sweets" ? "billed-sweets" : bill.billedTo === "anchal_caterers" ? "billed-caterers" : "";
        const billedText = formatBilledTo(bill.billedTo || null);

        return `
      <tr>
        <td>${formatDate(bill.receivedDate)}</td>
        <td>${bill.category?.name || "—"}</td>
        <td>${bill.vendor?.name || "—"}</td>
        <td class="${billedClass}">${billedText}</td>
        <td class="amount">${formatCurrency(bill.amount)}</td>
        <td class="${bill.status === "paid" ? "status-paid" : "status-unpaid"}">${bill.status.toUpperCase()}</td>
        <td class="${modeClass}">${modeText}</td>
        <td>${bill.paidDate ? formatDate(bill.paidDate) : "—"}</td>
        <td>${bill.note || "—"}</td>
        <td>${imageCell}</td>
      </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="footer">
    MithaiBills — Sweet Shop Bill Manager • Auto-generated report
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
    setTimeout(() => { printWindow.print(); }, 500);
  }
}