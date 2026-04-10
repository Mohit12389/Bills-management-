import { auth } from "@clerk/nextjs/server";
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

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function getClerkUserId(): Promise<string> {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}
