"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

interface ReportBill {
  id?: string;
  amount: string;
  status: string;
  note: string | null;
  imageUrl?: string | null;
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

// Get the base URL for image links
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

// Generate a public image URL for a bill
function getBillImageUrl(billId: string): string {
  return `${getBaseUrl()}/api/bills/image/${billId}`;
}

// ===== EXPORT AS EXCEL (HTML table with .xls — supports clickable hyperlinks) =====
export function exportToCSV(data: ReportData) {
  const billsWithImages = data.bills.filter((b) => b.imageUrl).length;

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>Bills Report</x:Name>
  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    td, th { padding: 6px 10px; vertical-align: top; }
    th { background: #e5651f; color: white; font-weight: 600; font-size: 12px; }
    .amount { text-align: right; font-family: monospace; }
    .paid { color: #16a34a; font-weight: 600; }
    .unpaid { color: #d97706; font-weight: 600; }
    .section { background: #f5f0eb; font-weight: 700; font-size: 13px; }
    .summary-label { font-weight: 600; background: #fafafa; }
    a { color: #e5651f; }
  </style>
</head>
<body>
  <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse; border-color:#e5e5e5;">
    <!-- Title -->
    <tr><td colspan="8" style="font-size:16px; font-weight:700; color:#e5651f; border:none; padding:12px 10px 4px;">${data.title}</td></tr>
    <tr><td colspan="8" style="font-size:11px; color:#888; border:none; padding:2px 10px 12px;">${data.dateRange || "All Time"} • Generated ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td></tr>

    <!-- Headers -->
    <tr>
      <th>Date Received</th>
      <th>Category</th>
      <th>Vendor</th>
      <th>Amount</th>
      <th>Status</th>
      <th>Date Paid</th>
      <th>Note</th>
      <th>Bill Image</th>
    </tr>

    <!-- Bill Rows -->
    ${data.bills
      .map((bill) => {
        const imageCell =
          bill.imageUrl && bill.id
            ? `<a href="${getBillImageUrl(bill.id)}" target="_blank">View Image</a>`
            : "—";
        const statusClass = bill.status === "paid" ? "paid" : "unpaid";

        return `
    <tr>
      <td>${formatDate(bill.receivedDate)}</td>
      <td>${bill.category?.name || "Uncategorized"}</td>
      <td>${bill.vendor?.name || "No vendor"}</td>
      <td class="amount">${bill.amount}</td>
      <td class="${statusClass}">${bill.status.toUpperCase()}</td>
      <td>${bill.paidDate ? formatDate(bill.paidDate) : "—"}</td>
      <td>${(bill.note || "—").replace(/\n/g, " ")}</td>
      <td>${imageCell}</td>
    </tr>`;
      })
      .join("")}

    <!-- Spacer -->
    <tr><td colspan="8" style="border:none;">&nbsp;</td></tr>

    <!-- Summary -->
    <tr class="section"><td colspan="8">SUMMARY</td></tr>
    <tr>
      <td class="summary-label">Total Amount</td>
      <td class="amount" colspan="2">${formatCurrency(data.totalAmount)}</td>
      <td class="summary-label">Total Bills</td>
      <td colspan="4">${data.bills.length}</td>
    </tr>
    <tr>
      <td class="summary-label">Total Paid</td>
      <td class="amount paid" colspan="2">${formatCurrency(data.totalPaid)}</td>
      <td class="summary-label">Bills with Images</td>
      <td colspan="4">${billsWithImages} of ${data.bills.length}</td>
    </tr>
    <tr>
      <td class="summary-label">Total Unpaid</td>
      <td class="amount unpaid" colspan="2">${formatCurrency(data.totalUnpaid)}</td>
      <td colspan="5"></td>
    </tr>

    ${
      data.categoryBreakdown.length > 0
        ? `
    <!-- Spacer -->
    <tr><td colspan="8" style="border:none;">&nbsp;</td></tr>

    <!-- Category Breakdown -->
    <tr class="section"><td colspan="8">CATEGORY BREAKDOWN</td></tr>
    <tr>
      <th>Category</th>
      <th class="amount">Total</th>
      <th class="amount">Paid</th>
      <th class="amount">Unpaid</th>
      <th colspan="4"></th>
    </tr>
    ${data.categoryBreakdown
      .map(
        (cat) => `
    <tr>
      <td>${cat.name}</td>
      <td class="amount">${formatCurrency(cat.total)}</td>
      <td class="amount paid">${formatCurrency(cat.paid)}</td>
      <td class="amount unpaid">${formatCurrency(cat.unpaid)}</td>
      <td colspan="4"></td>
    </tr>`
      )
      .join("")}
    `
        : ""
    }
  </table>
</body>
</html>`;

  // Download as .xls (Excel opens HTML tables natively with hyperlinks working)
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title.replace(/\s+/g, "_")}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; vertical-align: middle; }
    tr:hover td { background: #fafafa; }
    .amount { font-weight: 600; text-align: right; font-family: monospace; font-size: 12px; }
    .status-paid { color: #16a34a; font-weight: 600; font-size: 10px; }
    .status-unpaid { color: #d97706; font-weight: 600; font-size: 10px; }
    .category-table th { background: #e5651f; color: white; }
    .total-row td { font-weight: 700; border-top: 2px solid #333; background: #f8f8f8; }
    .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; color: #999; font-size: 10px; }
    .img-link { color: #e5651f; text-decoration: none; font-size: 10px; font-weight: 600; border: 1px solid #e5651f; padding: 2px 6px; border-radius: 4px; }
    .img-link:hover { background: #e5651f; color: white; }
    .no-img { color: #ccc; font-size: 10px; }
    @media print {
      body { padding: 12px; }
      .summary-card { break-inside: avoid; }
      .img-link { color: #e5651f !important; border-color: #e5651f !important; }
    }
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

  ${
    data.categoryBreakdown.length > 0
      ? `
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
      ${data.categoryBreakdown
        .map(
          (cat) => `
      <tr>
        <td>${cat.name}</td>
        <td class="amount">${formatCurrency(cat.total)}</td>
        <td class="amount" style="color:#16a34a">${formatCurrency(cat.paid)}</td>
        <td class="amount" style="color:#d97706">${formatCurrency(cat.unpaid)}</td>
      </tr>`
        )
        .join("")}
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="amount">${formatCurrency(data.totalAmount)}</td>
        <td class="amount" style="color:#16a34a">${formatCurrency(data.totalPaid)}</td>
        <td class="amount" style="color:#d97706">${formatCurrency(data.totalUnpaid)}</td>
      </tr>
    </tbody>
  </table>
  `
      : ""
  }

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
        <th>Image</th>
      </tr>
    </thead>
    <tbody>
      ${data.bills
        .map((bill) => {
          const imageLink =
            bill.imageUrl && bill.id
              ? `<a href="${getBillImageUrl(bill.id)}" target="_blank" class="img-link">View</a>`
              : `<span class="no-img">—</span>`;

          return `
      <tr>
        <td>${formatDate(bill.receivedDate)}</td>
        <td>${bill.category?.name || "—"}</td>
        <td>${bill.vendor?.name || "—"}</td>
        <td class="amount">${formatCurrency(bill.amount)}</td>
        <td class="${bill.status === "paid" ? "status-paid" : "status-unpaid"}">${bill.status.toUpperCase()}</td>
        <td>${bill.paidDate ? formatDate(bill.paidDate) : "—"}</td>
        <td>${bill.note || "—"}</td>
        <td>${imageLink}</td>
      </tr>`;
        })
        .join("")}
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
    printWindow.onload = () => {
      printWindow.print();
    };
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}