import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cache } from "react";

export const userCacheTag = (clerkId: string) => `user-id:${clerkId}`;

class UserNotFound extends Error {}

// A user's DB id never changes, so the Clerk id → DB id lookup is cached across requests
// (saves a database round trip on every page load and action). Cleared on user deletion
// via revalidateTag(userCacheTag(...)). "Not found" throws so it is never cached.
function getCachedUserId(clerkId: string) {
  return unstable_cache(
    async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
        columns: { id: true },
      });
      if (!user) throw new UserNotFound();
      return user.id;
    },
    ["user-id-by-clerk-id", clerkId],
    { tags: [userCacheTag(clerkId)], revalidate: 60 * 60 * 24 }
  )();
}

// Wrapped in React cache() so parallel data loaders on one page share a single lookup per request
export const getCurrentUser = cache(async function getCurrentUser(): Promise<{ id: string }> {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    return { id: await getCachedUserId(userId) };
  } catch (error) {
    if (!(error instanceof UserNotFound)) throw error;
  }

  // Signed in with Clerk but no DB row (e.g. the user.created webhook failed).
  // Create it now instead of redirecting a signed-in user back to /sign-in forever.
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  const [created] = await db
    .insert(users)
    .values({
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      imageUrl: clerkUser.imageUrl || null,
    })
    .onConflictDoUpdate({ target: users.clerkId, set: { updatedAt: new Date() } })
    .returning({ id: users.id });

  return created;
});
