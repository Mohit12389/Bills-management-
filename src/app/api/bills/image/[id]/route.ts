import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    // Next.js 14+ may pass params as a Promise
    const params = await context.params;
    const billId = params?.id;

    if (!billId) {
      return new NextResponse("Bill ID required", { status: 400 });
    }

    // Fetch the bill's image from database
    const bill = await db.query.bills.findFirst({
      where: eq(bills.id, billId),
      columns: {
        imageUrl: true,
      },
    });

    if (!bill) {
      return new NextResponse("Bill not found", { status: 404 });
    }

    if (!bill.imageUrl) {
      return new NextResponse("No image attached to this bill", { status: 404 });
    }

    const imageData = bill.imageUrl;

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
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // If it's a regular URL, redirect
    return NextResponse.redirect(imageData);
  } catch (error: any) {
    console.error("Image serve error:", error);
    return new NextResponse("Server error: " + (error?.message || "unknown"), {
      status: 500,
    });
  }
}
