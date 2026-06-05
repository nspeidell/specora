// GET /api/user/me — returns current user's billing info

import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Only return non-sensitive fields
  return Response.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    generationsUsed: user.generationsUsed,
    generationsLimit: user.generationsLimit,
    stripeCustomerId: user.stripeCustomerId ? "[set]" : null,
  });
}
