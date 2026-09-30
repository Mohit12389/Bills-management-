import { getBaseUrl } from "@/lib/export-report";

// export-report imports two formatters from a React component; Jest here doesn't compile JSX
jest.mock("@/components/shared/payment-mode-dialog", () => ({
  formatPaymentMode: (v: string) => v,
  formatBilledTo: (v: string) => v,
}));

describe("export image link base URL", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it("uses the configured public app URL so CA links don't depend on the deployment", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://bills.example.com";
    expect(getBaseUrl()).toBe("https://bills.example.com");
  });

  it("strips trailing slashes and whitespace", () => {
    process.env.NEXT_PUBLIC_APP_URL = "  https://bills.example.com/  ";
    expect(getBaseUrl()).toBe("https://bills.example.com");
  });

  it("falls back to the current page's origin when not configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const expected = typeof window !== "undefined" ? window.location.origin : "";
    expect(getBaseUrl()).toBe(expected);
  });
});
