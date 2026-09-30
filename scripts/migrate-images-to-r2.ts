/**
 * One-time migration: move bill images from the database (base64 in bills.image_url)
 * to Cloudflare R2 (bills.image_key).
 *
 *   npm run images:migrate -- --dry-run       Show what would happen, change nothing
 *   npm run images:migrate                    Copy images to R2 (keeps the DB copy)
 *   npm run images:migrate -- --clear-legacy  After checking the app: remove the DB copies
 *
 * Safe to re-run: bills that are already done are skipped.
 */
import { and, eq, isNotNull, isNull, like, sql } from "drizzle-orm";
import { db } from "../src/db";
import { bills } from "../src/db/schema";
import { ALLOWED_IMAGE_TYPES, getImageSize, newBillImageKey, putImage } from "../src/lib/r2";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clearLegacy = args.includes("--clear-legacy");

async function copyToR2() {
  // Only ids first — images are loaded one at a time to keep memory low
  const pending = await db
    .select({ id: bills.id, userId: bills.userId })
    .from(bills)
    .where(and(like(bills.imageUrl, "data:%"), isNull(bills.imageKey)));

  console.log(`${pending.length} bill image(s) to copy to R2${dryRun ? " (dry run)" : ""}`);
  if (dryRun) return;

  let copied = 0;
  const failed: string[] = [];

  for (const { id, userId } of pending) {
    try {
      const [row] = await db
        .select({ imageUrl: bills.imageUrl })
        .from(bills)
        .where(eq(bills.id, id));

      const match = row?.imageUrl?.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("not a valid base64 data URL");

      const contentType = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(match[1])
        ? match[1]
        : "image/jpeg";
      const body = Buffer.from(match[2], "base64");
      const key = newBillImageKey(userId, contentType);

      await putImage(key, body, contentType);

      // Verify before pointing the bill at it
      const storedSize = await getImageSize(key);
      if (storedSize !== body.length) {
        throw new Error(`size check failed (expected ${body.length}, got ${storedSize})`);
      }

      // Only set the key if no one else did in the meantime; the base64 copy is kept
      await db
        .update(bills)
        .set({ imageKey: key })
        .where(and(eq(bills.id, id), isNull(bills.imageKey)));

      copied++;
      console.log(`  ✓ ${id} → ${key} (${Math.round(body.length / 1024)} KB)`);
    } catch (error: any) {
      failed.push(id);
      console.error(`  ✗ ${id}: ${error?.message || error}`);
    }
  }

  console.log(`\nCopied: ${copied}, failed: ${failed.length}`);
  if (failed.length) {
    console.log("Failed bills keep their database image and can be retried by re-running.");
    process.exitCode = 1;
  } else {
    console.log("Check a few images in the app, then run with --clear-legacy to free database space.");
  }
}

async function clearLegacyCopies() {
  const done = await db
    .select({ id: bills.id, imageKey: bills.imageKey })
    .from(bills)
    .where(and(isNotNull(bills.imageKey), isNotNull(bills.imageUrl)));

  console.log(`${done.length} migrated bill(s) still have a database copy${dryRun ? " (dry run)" : ""}`);
  if (dryRun) return;

  let cleared = 0;
  for (const { id, imageKey } of done) {
    // Never delete the DB copy unless the R2 file is really there
    if ((await getImageSize(imageKey!)) === null) {
      console.error(`  ✗ ${id}: R2 file missing — keeping database copy`);
      process.exitCode = 1;
      continue;
    }
    await db.update(bills).set({ imageUrl: null }).where(eq(bills.id, id));
    cleared++;
  }
  console.log(`Cleared ${cleared} database copies.`);
}

async function summary() {
  const [counts] = await db
    .select({
      inR2: sql<number>`count(*) filter (where ${bills.imageKey} is not null)`.mapWith(Number),
      dbOnly: sql<number>`count(*) filter (where ${bills.imageKey} is null and ${bills.imageUrl} is not null)`.mapWith(Number),
      dbCopies: sql<number>`count(*) filter (where ${bills.imageKey} is not null and ${bills.imageUrl} is not null)`.mapWith(Number),
    })
    .from(bills);
  console.log(`\nNow: ${counts.inR2} in R2, ${counts.dbOnly} only in database, ${counts.dbCopies} with a leftover database copy`);
}

(clearLegacy ? clearLegacyCopies() : copyToR2())
  .then(summary)
  .then(() => process.exit(), (error) => {
    console.error(error);
    process.exit(1);
  });
