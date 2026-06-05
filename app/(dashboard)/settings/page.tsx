"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  CheckCircle2,
  Zap,
  AlertCircle,
  Loader2,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { PLANS, getPlan, isUnlimited, type PlanTier } from "@/lib/stripe/plans";

type BillingInfo = {
  id: string;
  email: string;
  fullName: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  generationsUsed: number | null;
  generationsLimit: number | null;
  stripeCustomerId: string | null;
};

// ── Usage meter ───────────────────────────────────────────────

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  if (limit === -1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4 text-brand" />
        <span>Unlimited generations</span>
      </div>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const atLimit = used >= limit;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">Generations used this period</span>
        <span className={`font-semibold ${atLimit ? "text-destructive" : "text-foreground"}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-destructive" : "gradient-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit && (
        <p className="text-xs text-destructive mt-1.5">
          Limit reached — upgrade to generate more specs.
        </p>
      )}
    </div>
  );
}

// ── Upgrade button ────────────────────────────────────────────

function UpgradeButton({
  tier,
  label,
  disabled,
}: {
  tier: "pro" | "agency";
  label: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
    </button>
  );
}

// ── Manage billing button ─────────────────────────────────────

function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handlePortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePortal}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-40"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ExternalLink className="w-4 h-4" />
      )}
      Manage billing
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const billingStatus = searchParams.get("billing");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setInfo(d as BillingInfo))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const currentTier = (info?.subscriptionTier ?? "free") as PlanTier;
  const currentPlan = getPlan(currentTier);
  const used = info?.generationsUsed ?? 0;
  const limit = info?.generationsLimit ?? currentPlan.generationsLimit;
  const isPaid = currentTier !== "free";

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Account and billing management.
      </p>

      {/* Billing success / cancel banner */}
      {billingStatus === "success" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Subscription activated — you&apos;re all set.
        </div>
      )}
      {billingStatus === "cancelled" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border text-muted-foreground text-sm mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Checkout cancelled — no changes were made.
        </div>
      )}

      {/* Account section */}
      <div className="border border-border rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-border bg-muted/10">
          <span className="text-sm font-medium text-foreground">Account</span>
        </div>
        <div className="p-5 flex items-center gap-4">
          <UserButton />
          <div>
            <p className="text-sm font-medium text-foreground">
              {info?.fullName ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{info?.email ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Current plan */}
      <div className="border border-border rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-border bg-muted/10 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Current plan</span>
          {isPaid && <ManageBillingButton />}
        </div>
        <div className="p-5">
          {loading ? (
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {currentPlan.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 font-medium">
                      {currentPlan.price}
                    </span>
                    {info?.subscriptionStatus === "past_due" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                        Payment due
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isUnlimited(currentPlan)
                      ? "Unlimited spec generations"
                      : `${currentPlan.generationsLimit} spec generations per month`}
                  </p>
                </div>
              </div>

              {/* Usage meter */}
              <UsageMeter used={used} limit={limit} />
            </div>
          )}
        </div>
      </div>

      {/* Plan comparison / upgrade */}
      {currentTier !== "agency" && (
        <div className="border border-border rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border bg-muted/10 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Upgrade</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {(["pro", "agency"] as const)
              .filter((t) => t !== currentTier)
              .map((tier) => {
                const plan = PLANS[tier];
                return (
                  <div key={tier} className="p-5">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-foreground mb-0.5">
                        {plan.name}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {plan.price}
                      </p>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <UpgradeButton
                      tier={tier}
                      label={`Upgrade to ${plan.name}`}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
