"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  getUploadUrl,
  newBillImageKey,
} from "@/lib/r2";

// Step 1 of an image upload: the browser asks for a signed URL, then PUTs the file
// straight to R2 (the image never passes through our server).
// The returned key is then saved on the bill via createBill/updateBill.
export async function createBillImageUpload(contentType: string, size: number) {
  const user = await getCurrentUser();

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("Only JPEG, PNG or WebP images are allowed");
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    throw new Error(`Image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
  }

  const key = newBillImageKey(user.id, contentType);
  const uploadUrl = await getUploadUrl(key, contentType, size);
  return { key, uploadUrl };
}
