// Copy of helper functions to avoid importing JSX component
function formatPaymentMode(mode: string | null): string {
  if (!mode) return "—";
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    net_banking: "Net Banking",
  };
  return map[mode] || mode;
}

function formatBilledTo(billedTo: string | null): string {
  if (!billedTo) return "—";
  const map: Record<string, string> = {
    anchal_sweets: "Anchal Sweets",
    anchal_caterers: "Anchal Caterers",
    anchal_caterers_original: "Anchal Caterers (Original)",
  };
  return map[billedTo] || billedTo;
}

describe("formatPaymentMode", () => {
  it("formats cash", () => {
    expect(formatPaymentMode("cash")).toBe("Cash");
  });

  it("formats upi", () => {
    expect(formatPaymentMode("upi")).toBe("UPI");
  });

  it("formats cheque", () => {
    expect(formatPaymentMode("cheque")).toBe("Cheque");
  });

  it("formats net_banking", () => {
    expect(formatPaymentMode("net_banking")).toBe("Net Banking");
  });

  it("handles null", () => {
    expect(formatPaymentMode(null)).toBe("—");
  });

  it("handles unknown value", () => {
    expect(formatPaymentMode("bitcoin")).toBe("bitcoin");
  });
});

describe("formatBilledTo", () => {
  it("formats anchal_sweets", () => {
    expect(formatBilledTo("anchal_sweets")).toBe("Anchal Sweets");
  });

  it("formats anchal_caterers", () => {
    expect(formatBilledTo("anchal_caterers")).toBe("Anchal Caterers");
  });

  it("formats anchal_caterers_original", () => {
    expect(formatBilledTo("anchal_caterers_original")).toBe("Anchal Caterers (Original)");
  });

  it("handles null", () => {
    expect(formatBilledTo(null)).toBe("—");
  });
});