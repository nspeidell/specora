"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Cpu,
  Layers,
  Target,
  Users,
  Sparkles,
  RefreshCw,
} from "lucide-react";

type Classification = {
  id: string;
  productType: string;
  productTypeLabel?: string;
  complexityLevel: number;
  complexityLabel: string;
  functionalDomain: string;
  functionalDomainLabel?: string;
  executionStyle: string;
  executionStyleLabel?: string;
  targetUsers: string | null;
  coreSystemSummary: string | null;
  requiresAiLayer: boolean | number;
  requiresMultiTenancy: boolean | number;
  requiresMarketplace: boolean | number;
  confidenceScore: number | null;
  classificationRationale: string | null;
  phaseTemplate: string | null;
};

const LOADING_STEPS = [
  "Reading discovery responses…",
  "Analyzing product type…",
  "Assessing complexity tier…",
  "Mapping functional domain…",
  "Determining execution model…",
  "Generating system blueprint…",
];

const COMPLEXITY_COLORS: Record<number, string> = {
  1: "text-emerald-400",
  2: "text-sky-400",
  3: "text-violet-400",
  4: "text-orange-400",
  5: "text-rose-400",
};

const COMPLEXITY_BG: Record<number, string> = {
  1: "bg-emerald-400/10 border-emerald-400/20",
  2: "bg-sky-400/10 border-sky-400/20",
  3: "bg-violet-400/10 border-violet-400/20",
  4: "bg-orange-400/10 border-orange-400/20",
  5: "bg-rose-400/10 border-rose-400/20",
};

export default function ClassifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [loadingStep, setLoadingStep] = useState(0);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Cycle loading messages while waiting
  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [status]);

  // Kick off classification on mount
  useEffect(() => {
    let cancelled = false;

    async function classify() {
      try {
        const res = await fetch("/api/ai/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.detail ?? data.error ?? "Classification failed.");
          setStatus("error");
          return;
        }

        setClassification(data.classification);
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      }
    }

    classify();
    return () => { cancelled = true; };
  }, [id]);

  async function handleConfirm() {
    setConfirming(true);
    // Phase 9 (inference) comes next — placeholder for now
    router.push(`/projects/${id}/infer`);
  }

  // ─── Loading state ───────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-brand glow-brand mx-auto mb-6">
            <Cpu className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Classifying intent
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Claude is analyzing your discovery responses to understand what you&apos;re building.
          </p>

          {/* Step progress */}
          <div className="space-y-2 text-left bg-muted/30 border border-border rounded-lg p-4">
            {LOADING_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5 text-sm">
                {i < loadingStep ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : i === loadingStep ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                )}
                <span
                  className={
                    i < loadingStep
                      ? "text-muted-foreground line-through"
                      : i === loadingStep
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                  }
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Classification failed
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {error ?? "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => {
              setStatus("loading");
              setLoadingStep(0);
              setError(null);
            }}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-muted border border-border hover:bg-muted/80 transition mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ─── Result state — System Blueprint Card ────────────────────
  if (!classification) return null;

  const complexityColor = COMPLEXITY_COLORS[classification.complexityLevel] ?? "text-muted-foreground";
  const complexityBg = COMPLEXITY_BG[classification.complexityLevel] ?? "bg-muted/30 border-border";
  const phases: string[] = classification.phaseTemplate
    ? JSON.parse(classification.phaseTemplate)
    : [];

  const flags = [
    classification.requiresAiLayer && { label: "AI Layer", icon: Sparkles },
    classification.requiresMultiTenancy && { label: "Multi-tenancy", icon: Users },
    classification.requiresMarketplace && { label: "Marketplace", icon: Target },
  ].filter(Boolean) as { label: string; icon: React.ElementType }[];

  return (
    <div className="min-h-full flex items-start justify-center pt-10 px-4 pb-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-brand glow-brand">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              System Blueprint
            </h1>
            <p className="text-xs text-muted-foreground">
              Review your project classification before we generate the spec
            </p>
          </div>
        </div>

        {/* Blueprint Card */}
        <div className="border border-border rounded-xl bg-muted/10 overflow-hidden mb-6">
          {/* Complexity banner */}
          <div className={`px-5 py-3 border-b border-border ${complexityBg} flex items-center justify-between`}>
            <span className={`text-sm font-semibold ${complexityColor}`}>
              {classification.complexityLabel}
            </span>
            {classification.confidenceScore != null && (
              <span className="text-xs text-muted-foreground">
                {classification.confidenceScore}% confidence
              </span>
            )}
          </div>

          {/* Core summary */}
          {classification.coreSystemSummary && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm text-foreground leading-relaxed">
                {classification.coreSystemSummary}
              </p>
            </div>
          )}

          {/* Classification grid */}
          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-border border-b border-border">
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Product type
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {classification.productTypeLabel ?? classification.productType}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Domain
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {classification.functionalDomainLabel ?? classification.functionalDomain}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Execution model
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {classification.executionStyleLabel ?? classification.executionStyle}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Target users
                </span>
              </div>
              <p className="text-sm font-medium text-foreground line-clamp-2">
                {classification.targetUsers ?? "—"}
              </p>
            </div>
          </div>

          {/* Architecture flags */}
          {flags.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
                Architecture requirements
              </p>
              <div className="flex flex-wrap gap-2">
                {flags.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase template */}
          {phases.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
                Build phases ({phases.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {phases.map((phase) => (
                  <span
                    key={phase}
                    className="px-2 py-0.5 rounded text-xs bg-muted border border-border text-muted-foreground"
                  >
                    {phase.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rationale */}
          {classification.classificationRationale && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Rationale
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {classification.classificationRationale}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Starting inference…
              </>
            ) : (
              <>
                This looks right — continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/50 text-center">
          This classification drives every decision in your generated spec. If something is wrong, go back and refine your discovery responses.
        </p>
      </div>
    </div>
  );
}
