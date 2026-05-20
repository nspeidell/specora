"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Server,
  Database,
  Shield,
  Globe,
  Cpu,
  AlertTriangle,
  Clock,
  BarChart3,
  Plug,
} from "lucide-react";

type Stack = {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  hosting: string;
  additional: string[];
};

type Infrastructure = {
  hosting: string;
  cdn: string;
  storage: string;
  backgroundJobs: string;
  aiGateway?: string;
};

type Recommendation = {
  id: string;
  recommendedStack: string | null;
  authStrategy: string | null;
  databaseDesign: string | null;
  infrastructure: string | null;
  recommendedApis: string | null;
  recommendedIntegrations: string | null;
  scalingConsiderations: string | null;
  complexityScore: number | null;
  complexityRationale: string | null;
  estimatedBuildWeeks: number | null;
  keyRisks: string | null;
};

const LOADING_STEPS = [
  "Loading classification results…",
  "Analyzing complexity requirements…",
  "Selecting optimal tech stack…",
  "Designing database architecture…",
  "Mapping integrations and APIs…",
  "Assessing risks and timelines…",
  "Finalizing architecture blueprint…",
];

const LAST_STEP_MESSAGES = [
  "Finalizing architecture blueprint…",
  "Claude is still thinking — almost there…",
  "Wrapping up the recommendation…",
  "Just a moment longer…",
];

function parseJSON<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score <= 3
      ? "bg-emerald-400"
      : score <= 6
      ? "bg-yellow-400"
      : score <= 8
      ? "bg-orange-400"
      : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {score}/10
      </span>
    </div>
  );
}

export default function InferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [loadingStep, setLoadingStep] = useState(0);
  const [lastStepIdx, setLastStepIdx] = useState(0);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  // When stuck on the last step, cycle through "still working" messages
  useEffect(() => {
    if (status !== "loading" || loadingStep < LOADING_STEPS.length - 1) return;
    const interval = setInterval(() => {
      setLastStepIdx((i) => (i + 1) % LAST_STEP_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [status, loadingStep]);

  useEffect(() => {
    let cancelled = false;

    async function infer() {
      try {
        const res = await fetch("/api/ai/infer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.detail ?? data.error ?? "Inference failed.");
          setStatus("error");
          return;
        }

        setRecommendation(data.recommendation);
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      }
    }

    infer();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleConfirm() {
    setConfirming(true);
    router.push(`/projects/${id}/generate`);
  }

  // ─── Loading ──────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-brand glow-brand mx-auto mb-6">
            <Server className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Inferring architecture
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Claude is designing the technical architecture for your product.
          </p>
          <div className="space-y-2 text-left bg-muted/30 border border-border rounded-lg p-4">
            {LOADING_STEPS.map((step, i) => {
              const isLast = i === LOADING_STEPS.length - 1;
              const isActive = i === loadingStep;
              const displayLabel = isLast && isActive
                ? LAST_STEP_MESSAGES[lastStepIdx]
                : step;
              return (
                <div key={step} className="flex items-center gap-2.5 text-sm">
                  {i < loadingStep ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isActive ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                  )}
                  <span
                    className={
                      i < loadingStep
                        ? "text-muted-foreground line-through"
                        : isActive
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }
                  >
                    {displayLabel}
                  </span>
                </div>
              );
            })}
          </div>
          {loadingStep === LOADING_STEPS.length - 1 && (
            <p className="mt-4 text-xs text-muted-foreground/50">
              This can take up to 30 seconds — please don't close the tab.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Inference failed
          </h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => { setStatus("loading"); setLoadingStep(0); setError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-muted border border-border hover:bg-muted/80 transition mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  const stack = parseJSON<Stack | null>(recommendation.recommendedStack, null);
  const infra = parseJSON<Infrastructure | null>(recommendation.infrastructure, null);
  const apis = parseJSON<string[]>(recommendation.recommendedApis, []);
  const integrations = parseJSON<string[]>(recommendation.recommendedIntegrations, []);
  const risks = parseJSON<string[]>(recommendation.keyRisks, []);

  // ─── Result ───────────────────────────────────────────────────
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
              Architecture Recommendation
            </h1>
            <p className="text-xs text-muted-foreground">
              Review the inferred technical architecture before spec generation
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Complexity + timeline */}
          <div className="border border-border rounded-xl bg-muted/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Technical complexity</span>
              </div>
              {recommendation.estimatedBuildWeeks != null && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  ~{recommendation.estimatedBuildWeeks} weeks to MVP
                </div>
              )}
            </div>
            {recommendation.complexityScore != null && (
              <ScoreBar score={recommendation.complexityScore} />
            )}
            {recommendation.complexityRationale && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {recommendation.complexityRationale}
              </p>
            )}
          </div>

          {/* Tech stack */}
          {stack && (
            <div className="border border-border rounded-xl bg-muted/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Recommended stack</span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "Frontend", value: stack.frontend },
                  { label: "Backend", value: stack.backend },
                  { label: "Database", value: stack.database },
                  { label: "Auth", value: stack.auth },
                  { label: "Hosting", value: stack.hosting },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-4 px-5 py-3">
                    <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">
                      {label}
                    </span>
                    <span className="text-sm text-foreground">{value}</span>
                  </div>
                ))}
                {stack.additional.length > 0 && (
                  <div className="flex items-start gap-4 px-5 py-3">
                    <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">
                      Also
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {stack.additional.map((item) => (
                        <span key={item} className="px-2 py-0.5 rounded text-xs bg-muted border border-border text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auth + DB */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {recommendation.authStrategy && (
              <div className="border border-border rounded-xl bg-muted/10 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Auth strategy</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {recommendation.authStrategy}
                </p>
              </div>
            )}
            {recommendation.databaseDesign && (
              <div className="border border-border rounded-xl bg-muted/10 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Database design</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {recommendation.databaseDesign}
                </p>
              </div>
            )}
          </div>

          {/* Infrastructure */}
          {infra && (
            <div className="border border-border rounded-xl bg-muted/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Infrastructure</span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "Hosting", value: infra.hosting },
                  { label: "CDN", value: infra.cdn },
                  { label: "Storage", value: infra.storage },
                  { label: "Jobs", value: infra.backgroundJobs },
                  infra.aiGateway ? { label: "AI Gateway", value: infra.aiGateway } : null,
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div key={row!.label} className="flex items-start gap-4 px-5 py-3">
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">
                        {row!.label}
                      </span>
                      <span className="text-sm text-foreground">{row!.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* APIs + Integrations */}
          {(apis.length > 0 || integrations.length > 0) && (
            <div className="border border-border rounded-xl bg-muted/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Plug className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">APIs & integrations</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...apis, ...integrations].map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md text-xs bg-muted border border-border text-muted-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scaling */}
          {recommendation.scalingConsiderations && (
            <div className="border border-border rounded-xl bg-muted/10 p-5">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Scaling considerations</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {recommendation.scalingConsiderations}
              </p>
            </div>
          )}

          {/* Key risks */}
          {risks.length > 0 && (
            <div className="border border-border rounded-xl bg-muted/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-foreground">Key risks</span>
              </div>
              <ul className="space-y-2">
                {risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="mt-6">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Preparing spec generation…
              </>
            ) : (
              <>
                Architecture looks good — generate spec
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-muted-foreground/50 text-center">
            This architecture drives the entire spec. If something is wrong, go back and update your discovery responses.
          </p>
        </div>
      </div>
    </div>
  );
}
