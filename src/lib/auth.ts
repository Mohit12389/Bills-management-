import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (user) return user;

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
    .returning();

  return created;
}

export async function getClerkUserId(): Promise<string> {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}
