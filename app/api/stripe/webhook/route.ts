// POST /api/stripe/webhook
// Public endpoint — verified by Stripe signature, NOT Clerk auth.
// Handles subscription lifecycle events to keep D1 in sync.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { PLANS, tierFromPriceId, getPriceId, type PlanTier } from "@/lib/stripe/plans";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET ??
    (globalThis as unknown as Record<string, string>).STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] Signature verification failed:", msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  try {
    switch (event.type) {

      // ── New subscription created via Checkout ─────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const tier = (session.metadata?.tier ?? "free") as PlanTier;
        if (!userId) break;

        const plan = PLANS[tier] ?? PLANS.free;

        await db
          .update(users)
          .set({
            stripeCustomerId: session.customer as string,
            subscriptionStatus: "active",
            subscriptionTier: tier,
            generationsLimit: plan.generationsLimit,
            generationsUsed: 0, // reset on new subscription
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        break;
      }

      // ── Subscription changed (upgrade / downgrade) ────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const tier = priceId ? tierFromPriceId(priceId) : "free";
        const plan = PLANS[tier] ?? PLANS.free;
        const status = sub.status === "active" ? "active" : sub.status;

        await db
          .update(users)
          .set({
            subscriptionStatus: status,
            subscriptionTier: tier,
            generationsLimit: plan.generationsLimit,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        break;
      }

      // ── Subscription cancelled / expired ─────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await db
          .update(users)
          .set({
            subscriptionStatus: "cancelled",
            subscriptionTier: "free",
            generationsLimit: PLANS.free.generationsLimit,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        break;
      }

      // ── Monthly invoice paid → reset generation counter ───
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== "subscription_cycle") break;

        const customerId = invoice.customer as string;
        if (!customerId) break;

        // Find user by Stripe customer ID
        const user = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, customerId),
        });
        if (!user) break;

        await db
          .update(users)
          .set({ generationsUsed: 0, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        break;
      }

      // ── Payment failed ────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        const user = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, customerId),
        });
        if (!user) break;

        await db
          .update(users)
          .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
          .where(eq(users.id, user.id));

        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stripe/webhook] Error handling ${event.type}:`, msg);
    return new Response(`Handler error: ${msg}`, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
