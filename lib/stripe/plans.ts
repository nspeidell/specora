// ============================================================
// STRIPE PLANS — Specora CTO-as-a-Service
//
// Tiers gate the number of specs an admin can generate per month.
// -1 = unlimited.
//
// To wire up:
//  1. Create products + prices in Stripe dashboard
//  2. Set STRIPE_PRICE_PRO and STRIPE_PRICE_AGENCY in env
// ============================================================

export type PlanTier = "free" | "pro" | "agency";

export type Plan = {
  tier: PlanTier;
  name: string;
  price: string;                 // Display string
  priceMonthly: number;          // Cents, 0 for free
  generationsLimit: number;      // -1 = unlimited
  priceId: string | null;        // Stripe Price ID
  features: string[];
};

export function getPriceId(key: string): string | null {
  return (
    process.env[key] ??
    (globalThis as unknown as Record<string, string>)[key] ??
    null
  );
}

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    tier: "free",
    name: "Free",
    price: "$0",
    priceMonthly: 0,
    generationsLimit: 1,
    priceId: null,
    features: [
      "1 spec generation",
      "All output documents",
      "Tech spec + operational architecture + scope plan",
      "Intelligence analysis",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    price: "$79/mo",
    priceMonthly: 7900,
    generationsLimit: 20,
    priceId: null, // Set at runtime via getPriceId("STRIPE_PRICE_PRO")
    features: [
      "20 spec generations / month",
      "All output documents",
      "Unlimited discovery links",
      "Intelligence analysis",
      "Priority support",
    ],
  },
  agency: {
    tier: "agency",
    name: "Agency",
    price: "$199/mo",
    priceMonthly: 19900,
    generationsLimit: -1,
    priceId: null, // Set at runtime via getPriceId("STRIPE_PRICE_AGENCY")
    features: [
      "Unlimited spec generations",
      "Unlimited discovery links",
      "All output documents",
      "Intelligence analysis",
      "White-label ready",
      "Priority support",
    ],
  },
};

export function getPlan(tier: string | null | undefined): Plan {
  return PLANS[(tier as PlanTier) ?? "free"] ?? PLANS.free;
}

export function isUnlimited(plan: Plan): boolean {
  return plan.generationsLimit === -1;
}

export function isAtLimit(plan: Plan, used: number): boolean {
  if (isUnlimited(plan)) return false;
  return used >= plan.generationsLimit;
}

// Maps Stripe Price IDs back to tiers — used in webhook handler.
export function tierFromPriceId(priceId: string): PlanTier {
  const pro = getPriceId("STRIPE_PRICE_PRO");
  const agency = getPriceId("STRIPE_PRICE_AGENCY");
  if (priceId === pro) return "pro";
  if (priceId === agency) return "agency";
  return "free";
}
