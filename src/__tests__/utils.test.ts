import { formatCurrency, formatDate } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats a whole number correctly", () => {
    const result = formatCurrency(1000);
    expect(result).toContain("1,000");
  });

  it("formats a decimal number correctly", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1,234");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });

  it("formats string amounts", () => {
    const result = formatCurrency("5000");
    expect(result).toContain("5,000");
  });

  it("formats large amounts", () => {
    const result = formatCurrency(383569);
    expect(result).toContain("3,83,569");
  });
});

describe("formatDate", () => {
  it("formats a date object", () => {
    const date = new Date("2026-06-15");
    const result = formatDate(date);
    expect(result).toContain("Jun");
    expect(result).toContain("2026");
    expect(result).toContain("15");
  });

  it("formats a date string", () => {
    const result = formatDate("2026-04-10");
    expect(result).toContain("Apr");
    expect(result).toContain("2026");
  });

  it("handles null gracefully", () => {
    const result = formatDate(null);
    expect(result).toBe("—");
  });
});