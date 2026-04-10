import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;

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

    if (!bill || !bill.imageUrl) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const imageData = bill.imageUrl;

    // Check if it's a base64 data URL
    if (imageData.startsWith("data:")) {
      // Parse the data URL: data:image/jpeg;base64,/9j/4AAQ...
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
          "Content-Disposition": `inline; filename="bill-${billId}.${mimeType.split("/")[1] || "jpg"}"`,
        },
      });
    }

    // If it's a regular URL (legacy), redirect to it
    return NextResponse.redirect(imageData);
  } catch (error: any) {
    console.error("Image serve error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}