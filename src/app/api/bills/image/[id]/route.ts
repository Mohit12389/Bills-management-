import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { getViewUrl } from "@/lib/r2";

// Always run on request with fresh data — never serve a cached answer for which file a bill uses
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Signed R2 links are valid for 1 hour
const VIEW_URL_TTL_SECONDS = 60 * 60;

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    // Next.js 14+ may pass params as a Promise
    const params = await context.params;
    const billId = params?.id;

    if (!billId || !UUID_RE.test(billId)) {
      return new NextResponse("Bill not found", { status: 404 });
    }

    // Public on purpose: exported PDFs link here so the CA can open images without logging in.
    // The R2 bucket itself stays private — we redirect to a short-lived signed URL,
    // created fresh on every visit, so these links never expire.
    const bill = await db.query.bills.findFirst({
      where: eq(bills.id, billId),
      columns: { imageKey: true },
    });

    if (!bill) {
      return new NextResponse("Bill not found", { status: 404 });
    }

    if (bill.imageKey) {
      const url = await getViewUrl(bill.imageKey, VIEW_URL_TTL_SECONDS);
      // Never cache the redirect: when a bill's photo is replaced the old file is deleted,
      // and a cached redirect would send the browser to it ("NoSuchKey")
      return NextResponse.redirect(url, {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Legacy: image still stored as base64 in the database (not yet migrated to R2)
    const legacy = await db.query.bills.findFirst({
      where: eq(bills.id, billId),
      columns: { imageUrl: true },
    });

    if (!legacy?.imageUrl) {
      return new NextResponse("No image attached to this bill", { status: 404 });
    }

    const imageData = legacy.imageUrl;

    // Public on purpose (exported PDFs link here for the CA), but not immutable:
    // images can be replaced, so browsers must revalidate using the ETag.
    const etag = `"${createHash("sha1").update(imageData).digest("hex")}"`;
    const cacheHeaders = {
      ETag: etag,
      "Cache-Control": "public, no-cache",
    };
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    // Handle base64 data URL
    if (imageData.startsWith("data:")) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);

      if (!matches) {
        return new NextResponse("Invalid image data", { status: 500 });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const imageBuffer = Buffer.from(base64Data, "base64");

      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": imageBuffer.length.toString(),
          ...cacheHeaders,
        },
      });
    }

    // If it's a regular URL, redirect
    if (/^https?:\/\//.test(imageData)) {
      return NextResponse.redirect(imageData);
    }

    // Anything else (e.g. a "has_image" flag saved by the old edit bug) is not a real image
    return new NextResponse("No image attached to this bill", { status: 404 });
  } catch (error: any) {
    console.error("Image serve error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
