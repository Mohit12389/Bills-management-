import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "MithaiBills — Sweet Shop Bill Manager",
  description:
    "Manage your sweet shop bills, track payments, and get insights on spending across categories and vendors.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page use the full iPhone screen; the safe-area insets in the CSS keep content clear of the notch
  viewportFit: "cover",
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}