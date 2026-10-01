import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, newBillImageKey } from "@/lib/bill-image-keys";
import { putImage } from "@/lib/r2";

// Bill photo upload. The browser sends the (already compressed) photo here and we store it
// in R2. Uploading through our own server means the browser never talks to R2 directly,
// so it works from any address (production domain, per-deployment URLs, localhost) with
// no CORS setup. Photos are ≤2MB, well under Vercel's 4.5MB request limit.
export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  try {
    const user = await getCurrentUser();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No image received" }, { status: 400 });
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG or WebP images are allowed" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB` },
        { status: 400 }
      );
    }

    const key = newBillImageKey(user.id, file.type);
    await putImage(key, Buffer.from(await file.arrayBuffer()), file.type);

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Bill image upload failed:", error);
    return NextResponse.json({ error: "Could not save the image. Please try again." }, { status: 500 });
  }
}
