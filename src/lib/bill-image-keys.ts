import { randomUUID } from "crypto";

// Bill image naming and limits. Kept separate from ./r2 so code that only needs these
// doesn't load the (heavy) AWS S3 SDK — that would slow down every server cold start.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Keys are namespaced per user so a user can only attach their own uploads
function billImagePrefix(userId: string) {
  return `bills/${userId}/`;
}

export function isOwnBillImageKey(key: string, userId: string) {
  return key.startsWith(billImagePrefix(userId)) && !key.includes("..");
}

export function newBillImageKey(userId: string, contentType: string) {
  return `${billImagePrefix(userId)}${randomUUID()}.${EXTENSIONS[contentType] ?? "jpg"}`;
}
