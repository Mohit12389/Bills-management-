describe("CSV Export Logic", () => {
  function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  it("returns plain text unchanged", () => {
    expect(csvEscape("hello")).toBe("hello");
  });

  it("wraps comma-containing values in quotes", () => {
    expect(csvEscape("hello, world")).toBe('"hello, world"');
  });

  it("escapes double quotes", () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it("handles newlines", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles empty string", () => {
    expect(csvEscape("")).toBe("");
  });

  // Test bill data calculation logic
  describe("Bill calculations", () => {
    const mockBills = [
      { amount: "1000", status: "paid", paymentMode: "cash", billedTo: "anchal_sweets" },
      { amount: "2000", status: "paid", paymentMode: "upi", billedTo: "anchal_caterers" },
      { amount: "500", status: "unpaid", paymentMode: null, billedTo: "anchal_sweets" },
      { amount: "1500", status: "paid", paymentMode: "cash", billedTo: "anchal_caterers_original" },
      { amount: "3000", status: "unpaid", paymentMode: null, billedTo: null },
    ];

    it("calculates total correctly", () => {
      const total = mockBills.reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(total).toBe(8000);
    });

    it("calculates paid total correctly", () => {
      const paid = mockBills
        .filter((b) => b.status === "paid")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(paid).toBe(4500);
    });

    it("calculates unpaid total correctly", () => {
      const unpaid = mockBills
        .filter((b) => b.status === "unpaid")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(unpaid).toBe(3500);
    });

    it("calculates cash total correctly", () => {
      const cash = mockBills
        .filter((b) => b.paymentMode === "cash")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(cash).toBe(2500);
    });

    it("calculates UPI total correctly", () => {
      const upi = mockBills
        .filter((b) => b.paymentMode === "upi")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(upi).toBe(2000);
    });

    it("calculates Anchal Sweets total correctly", () => {
      const sweets = mockBills
        .filter((b) => b.billedTo === "anchal_sweets")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(sweets).toBe(1500);
    });

    it("calculates Anchal Caterers total correctly", () => {
      const caterers = mockBills
        .filter((b) => b.billedTo === "anchal_caterers")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(caterers).toBe(2000);
    });

    it("calculates Anchal Caterers Original total correctly", () => {
      const original = mockBills
        .filter((b) => b.billedTo === "anchal_caterers_original")
        .reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(original).toBe(1500);
    });

    it("counts bills by status correctly", () => {
      const paidCount = mockBills.filter((b) => b.status === "paid").length;
      const unpaidCount = mockBills.filter((b) => b.status === "unpaid").length;
      expect(paidCount).toBe(3);
      expect(unpaidCount).toBe(2);
    });

    it("paid + unpaid equals total", () => {
      const paid = mockBills.filter((b) => b.status === "paid").reduce((s, b) => s + parseFloat(b.amount), 0);
      const unpaid = mockBills.filter((b) => b.status === "unpaid").reduce((s, b) => s + parseFloat(b.amount), 0);
      const total = mockBills.reduce((s, b) => s + parseFloat(b.amount), 0);
      expect(paid + unpaid).toBe(total);
    });
  });
});