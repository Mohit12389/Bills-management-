import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Bill images live in a PRIVATE Cloudflare R2 bucket.
// - Uploads: the browser posts to /api/bills/image-upload, which stores the file here
//   (no browser-to-R2 traffic, so no CORS setup is needed).
// - Viewing: /api/bills/image/[id] redirects to a short-lived signed GET URL,
//   so links in exported PDFs never expire and never need a login.

const bucket = process.env.R2_BUCKET!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

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

// Signed URL for viewing an image — created fresh on every click of a bill image link
export function getViewUrl(key: string, expiresIn = 60 * 60) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

// Server-side upload (used by the migration script)
export async function putImage(key: string, body: Buffer, contentType: string) {
  await r2.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
}

// Returns the stored size in bytes, or null if the object doesn't exist
export async function getImageSize(key: string): Promise<number | null> {
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") return null;
    throw error;
  }
}

// Best-effort delete: a failure here must never block deleting the bill itself
export async function deleteImages(keys: (string | null | undefined)[]) {
  const objects = keys.filter((k): k is string => !!k).map((Key) => ({ Key }));
  if (objects.length === 0) return;
  try {
    // DeleteObjects accepts up to 1000 keys per request
    for (let i = 0; i < objects.length; i += 1000) {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects.slice(i, i + 1000), Quiet: true },
        })
      );
    }
  } catch (error) {
    console.error("R2 delete failed (orphaned images may remain):", error);
  }
}
