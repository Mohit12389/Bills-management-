import { billSchema, categorySchema, vendorSchema } from "@/lib/validations";

describe("billSchema", () => {
  const validBill = {
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    amount: "1500",
    receivedDate: "2026-06-15",
  };

  it("validates a correct bill", () => {
    const result = billSchema.safeParse(validBill);
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const result = billSchema.safeParse({
      ...validBill,
      amount: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = billSchema.safeParse({
      ...validBill,
      amount: "-500",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = billSchema.safeParse({
      ...validBill,
      amount: "0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing receivedDate", () => {
    const result = billSchema.safeParse({
      ...validBill,
      receivedDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid categoryId", () => {
    const result = billSchema.safeParse({
      ...validBill,
      categoryId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid billedTo values", () => {
    const values = ["anchal_sweets", "anchal_caterers", "anchal_caterers_original"];
    values.forEach((billedTo) => {
      const result = billSchema.safeParse({ ...validBill, billedTo });
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid billedTo value", () => {
    const result = billSchema.safeParse({
      ...validBill,
      billedTo: "random_company",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as null", () => {
    const result = billSchema.safeParse({
      ...validBill,
      note: null,
      vendorId: null,
      dueDate: null,
      billedTo: null,
      invoiceNumber: null,
      imageUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts invoice number up to 100 characters", () => {
    const result = billSchema.safeParse({
      ...validBill,
      invoiceNumber: "INV-2026-001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invoice number over 100 characters", () => {
    const result = billSchema.safeParse({
      ...validBill,
      invoiceNumber: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("validates a correct category", () => {
    const result = categorySchema.safeParse({ name: "Dairy" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = categorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    const result = categorySchema.safeParse({ name: "A".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("provides default icon and color", () => {
    const result = categorySchema.parse({ name: "Test" });
    expect(result.icon).toBe("Package");
    expect(result.color).toBe("#6366f1");
  });
});

describe("vendorSchema", () => {
  const validVendor = {
    name: "Amul Distributor",
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("validates a correct vendor", () => {
    const result = vendorSchema.safeParse(validVendor);
    expect(result.success).toBe(true);
  });

  it("rejects empty vendor name", () => {
    const result = vendorSchema.safeParse({ ...validVendor, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid categoryId", () => {
    const result = vendorSchema.safeParse({ ...validVendor, categoryId: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts optional phone and address", () => {
    const result = vendorSchema.safeParse({
      ...validVendor,
      phone: "9876543210",
      address: "123 Main St",
    });
    expect(result.success).toBe(true);
  });
});