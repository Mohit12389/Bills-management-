import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only images are allowed" },
        { status: 400 }
      );
    }

    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Safety check — client compresses to ~100-300KB
    // Allow up to 500KB after compression
    if (buffer.length > 500 * 1024) {
      const sizeKB = Math.round(buffer.length / 1024);
      return NextResponse.json(
        {
          error: `Image is ${sizeKB}KB after compression (max 500KB). The image will be compressed further automatically — please try again.`,
        },
        { status: 400 }
      );
    }

    const base64 = buffer.toString("base64");
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}