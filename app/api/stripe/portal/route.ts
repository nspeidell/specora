// POST /api/stripe/portal
// Creates a Stripe Customer Portal session so users can manage
// their subscription, update payment method, or cancel.

import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
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

  if (!user.stripeCustomerId) {
    return Response.json(
      { error: "No billing account found — subscribe first" },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (env as Record<string, string>).NEXT_PUBLIC_APP_URL ??
    "https://specora.nickspeidell.workers.dev";

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return Response.json({ url: session.url });
}
