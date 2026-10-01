import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    if (!bill.imageKey) {
      return new NextResponse("No image attached to this bill", { status: 404 });
    }

    const url = await getViewUrl(bill.imageKey, VIEW_URL_TTL_SECONDS);

    // Never cache the redirect: when a bill's photo is replaced the old file is deleted,
    // and a cached redirect would send the browser to it ("NoSuchKey")
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Image serve error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
