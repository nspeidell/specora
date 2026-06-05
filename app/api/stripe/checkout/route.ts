// POST /api/stripe/checkout
// Creates a Stripe Checkout session and returns the URL.
// Client redirects to that URL to complete payment.

import { auth, currentUser } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { PLANS, getPriceId, type PlanTier } from "@/lib/stripe/plans";
import { z } from "zod";

const bodySchema = z.object({
  tier: z.enum(["pro", "agency"]),
});

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "tier must be 'pro' or 'agency'" }, { status: 400 });
  }

  const { tier } = parsed.data;
  const plan = PLANS[tier];
  const priceId = getPriceId(
    tier === "pro" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_AGENCY"
  );

  if (!priceId) {
    return Response.json(
      { error: `STRIPE_PRICE_${tier.toUpperCase()} is not configured` },
      { status: 500 }
    );
  }

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  // Resolve internal user
  let user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  // Auto-provision if webhook missed
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    await db.insert(users).values({
      clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      fullName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser.imageUrl || null,
    });
    user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });
  }

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (env as Record<string, string>).NEXT_PUBLIC_APP_URL ??
    "https://specora.nickspeidell.workers.dev";

  // Create or retrieve Stripe customer
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName ?? undefined,
      metadata: { userId: user.id, clerkUserId },
    });
    customerId = customer.id;

    // Persist immediately so we don't create duplicate customers
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, user.id));
  }

  // Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancelled`,
    metadata: {
      userId: user.id,
      tier,
    },
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
