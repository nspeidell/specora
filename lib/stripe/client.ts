import Stripe from "stripe";

// Stripe client — initialized lazily so it works in both edge and Node contexts.
// Always use getStripe() — never import stripe directly.

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key =
      process.env.STRIPE_SECRET_KEY ??
      (globalThis as unknown as Record<string, string>).STRIPE_SECRET_KEY;

    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    _stripe = new Stripe(key, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}
