"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Palette,
  TrendingUp,
  Zap,
  ChevronRight,
  Download,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Layers,
  Server,
  Shield,
  Database,
  Globe,
  Cpu,
  AlertTriangle,
  BarChart3,
  Plug,
  RefreshCw,
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  SplitSquareHorizontal,
  ListChecks,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/ai/prompts/intelligence";

// ─── Status config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string; nextHref?: (id: string) => string }> = {
  draft:      { label: "Draft",            color: "bg-muted text-muted-foreground border-border" },
  discovery:  { label: "In discovery",     color: "bg-blue-500/10 text-blue-400 border-blue-500/20", next: "discovery", nextLabel: "Continue discovery", nextHref: (id) => `/projects/${id}/discover` },
  analyzing:  { label: "Analyzing",        color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  analyzed:   { label: "Analysis ready",   color: "bg-violet-500/10 text-violet-400 border-violet-500/20", next: "classify", nextLabel: "Classify intent", nextHref: (id) => `/projects/${id}/classify` },
  classified: { label: "Classified",       color: "bg-amber-500/10 text-amber-400 border-amber-500/20", next: "infer", nextLabel: "Infer architecture", nextHref: (id) => `/projects/${id}/infer` },
  inferring:  { label: "Architecture ready", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", next: "generate", nextLabel: "Generate spec", nextHref: (id) => `/projects/${id}/generate` },
  complete:   { label: "Complete",         color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  archived:   { label: "Archived",         color: "bg-muted text-muted-foreground border-border" },
};

// ─── Types ─────────────────────────────────────────────────────

type ProjectData = {
  project: {
    id: string; name: string; description: string | null;
    status: string | null; createdAt: number | null;
    intelligenceStatus: string | null; intelligenceResult: string | null;
    clientName: string | null; clientEmail: string | null;
  };
  session: { id: string; status: string | null; currentStep: number | null; totalSteps: number | null } | null;
  classification: {
    productType: string; complexityLevel: number; complexityLabel: string;
    functionalDomain: string; executionStyle: string;
    targetUsers: string | null; coreSystemSummary: string | null;
    classificationRationale: string | null; confidenceScore: number | null;
    requiresAiLayer: boolean | null; requiresMultiTenancy: boolean | null;
    requiresMarketplace: boolean | null; phaseTemplate: string | null;
  } | null;
  architecture: {
    recommendedStack: string | null; authStrategy: string | null;
    databaseDesign: string | null; infrastructure: string | null;
    recommendedApis: string | null; recommendedIntegrations: string | null;
    scalingConsiderations: string | null; complexityScore: number | null;
    complexityRationale: string | null; estimatedBuildWeeks: number | null;
    keyRisks: string | null;
  } | null;
  spec: { id: string; status: string | null } | null;
  specVersion: { fullSpecMarkdown: string | null; fullSpecJson: string | null; versionNumber: string } | null;
};

type TabId = "tech" | "brand" | "marketing";

// ─── Helpers ───────────────────────────────────────────────────

function parseJSON<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts * 1000;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Mini sub-components ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl bg-muted/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted/80 transition text-muted-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DownloadButton({ content, filename, label }: { content: string; filename: string; label: string }) {
  return (
    <button
      onClick={() => {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted/80 transition text-muted-foreground"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score <= 3 ? "bg-emerald-400" : score <= 6 ? "bg-yellow-400" : score <= 8 ? "bg-orange-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-foreground tabular-nums">{score}/10</span>
    </div>
  );
}

// Inline markdown renderer (same as generate page)
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-foreground mt-8 mb-3 border-b border-border pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-2 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs bg-muted border border-border font-mono text-foreground">$1</code>')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-muted border border-border rounded-lg p-4 overflow-x-auto my-4 text-xs font-mono text-foreground leading-relaxed"><code>$1</code></pre>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 text-sm text-muted-foreground leading-relaxed"><span class="text-primary mt-1 shrink-0">•</span><span>$1</span></li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-muted-foreground leading-relaxed pl-1">$1</li>')
    .replace(/^---$/gm, '<hr class="border-border my-6" />')
    .replace(/^(?!<)(.+)$/gm, '<p class="text-sm text-muted-foreground leading-relaxed mb-2">$1</p>')
    .replace(/<p class="[^"]*"><\/p>/g, '')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) =>
      match.includes('flex gap-2')
        ? `<ul class="space-y-1.5 my-3">${match}</ul>`
        : `<ol class="list-decimal list-inside space-y-1.5 my-3 text-sm text-muted-foreground">${match}</ol>`
    );
}

// ─── Main page ─────────────────────────────────────────────────

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("tech");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  async function runIntelligence() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/projects/${id}/intelligence`, { method: "POST" });
      const body = await res.json() as { ok?: boolean; result?: IntelligenceResult; error?: string };
      if (!res.ok) {
        setAnalyzeError(body.error ?? "Analysis failed. Please try again.");
        return;
      }
      // Reload project data to get updated status + result
      const updated = await fetch(`/api/projects/${id}`).then((r) => r.json()) as ProjectData;
      setData(updated);
    } catch {
      setAnalyzeError("Network error. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); } else { setData(d); }
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{error ?? "Project not found"}</p>
          <Link href="/projects" className="mt-3 inline-block text-xs text-primary hover:underline">← Back to projects</Link>
        </div>
      </div>
    );
  }

  const { project, session, classification, architecture, spec, specVersion } = data;
  const status = project.status ?? "draft";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  // Parse architecture fields
  type Stack = { frontend: string; backend: string; database: string; auth: string; hosting: string; additional: string[] };
  type Infra = { hosting: string; cdn: string; storage: string; backgroundJobs: string; aiGateway?: string };
  const stack = parseJSON<Stack | null>(architecture?.recommendedStack ?? null, null);
  const infra = parseJSON<Infra | null>(architecture?.infrastructure ?? null, null);
  const apis = parseJSON<string[]>(architecture?.recommendedApis ?? null, []);
  const integrations = parseJSON<string[]>(architecture?.recommendedIntegrations ?? null, []);
  const risks = parseJSON<string[]>(architecture?.keyRisks ?? null, []);
  const phases = parseJSON<string[]>(classification?.phaseTemplate ?? null, []);

  // Parse spec documents
  type Docs = { techSpec: string; brandPlan: string; marketingPlan: string };
  const docs = parseJSON<Docs | null>(specVersion?.fullSpecJson ?? null, null) ?? {
    techSpec: specVersion?.fullSpecMarkdown ?? "",
    brandPlan: "",
    marketingPlan: "",
  };

  const TABS = [
    { id: "tech" as TabId, label: "Tech Spec", icon: FileText, content: docs.techSpec, filename: "tech-spec.md" },
    { id: "brand" as TabId, label: "Brand Plan", icon: Palette, content: docs.brandPlan, filename: "brand-plan.md" },
    { id: "marketing" as TabId, label: "Marketing Plan", icon: TrendingUp, content: docs.marketingPlan, filename: "marketing-plan.md" },
  ];

  const activeTabData = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 max-w-3xl mx-auto pb-16">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
        <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl font-semibold text-foreground truncate">{project.name}</h1>
            <StatusBadge status={status} />
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
          )}
          {project.createdAt && (
            <p className="text-xs text-muted-foreground/50 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Created {timeAgo(project.createdAt)}
            </p>
          )}
        </div>
        {statusCfg.next && statusCfg.nextHref && (
          <Link
            href={statusCfg.nextHref(id)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity"
          >
            {statusCfg.nextLabel}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* ── Progress pipeline ── */}
      <div className="border border-border rounded-xl bg-muted/10 p-4 mb-6">
        <div className="flex items-center gap-0">
          {[
            { key: "discovery", label: "Discovery", done: !!session && session.status === "completed" || ["analyzing","analyzed","classified","inferring","complete"].includes(status) },
            { key: "analysis", label: "Analysis",  done: project.intelligenceStatus === "complete" },
            { key: "classify", label: "Blueprint", done: !!classification },
            { key: "infer",    label: "Architecture", done: !!architecture },
            { key: "generate", label: "Spec",      done: status === "complete" },
          ].map(({ label, done }, i, arr) => (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground/40"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${done ? "text-foreground" : "text-muted-foreground/40"}`}>{label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${done ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Generated documents (shown only when complete) ── */}
        {status === "complete" && specVersion && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Generated documents</span>
                <span className="text-xs text-muted-foreground">v{specVersion.versionNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                {activeTabData.content && (
                  <>
                    <CopyButton text={activeTabData.content} />
                    <DownloadButton content={activeTabData.content} filename={activeTabData.filename} label="Download .md" />
                  </>
                )}
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-border bg-muted/20">
              {TABS.map(({ id: tabId, label, icon: Icon }) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    activeTab === tabId
                      ? "bg-background border border-border text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {/* Doc content */}
            {activeTabData.content ? (
              <div
                className="p-6 max-h-[600px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeTabData.content) }}
              />
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">No content for this document.</div>
            )}
            {/* Download all */}
            <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Download all:</span>
              <DownloadButton content={docs.techSpec} filename="tech-spec.md" label="Tech Spec" />
              <DownloadButton content={docs.brandPlan} filename="brand-plan.md" label="Brand Plan" />
              <DownloadButton content={docs.marketingPlan} filename="marketing-plan.md" label="Marketing Plan" />
            </div>
          </div>
        )}

        {/* ── Analyze CTA — shown when discovery is done but analysis hasn't run ── */}
        {status === "discovery" && session?.status === "completed" && project.intelligenceStatus === "pending" && (
          <div className="border border-violet-500/25 rounded-xl bg-violet-500/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" />
                Discovery complete — ready for analysis
              </p>
              <p className="text-xs text-muted-foreground">
                Run the intelligence pass to detect contradictions, infer missing requirements, and define MVP scope before generating the spec.
              </p>
            </div>
            <button
              type="button"
              onClick={runIntelligence}
              disabled={analyzing}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Brain className="w-4 h-4" /> Analyze</>}
            </button>
          </div>
        )}

        {/* Analyzing in progress indicator */}
        {(status === "analyzing" || analyzing) && (
          <div className="border border-violet-500/20 rounded-xl bg-violet-500/5 p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Running intelligence analysis…</p>
              <p className="text-xs text-muted-foreground mt-0.5">Detecting contradictions, inferring requirements, defining MVP scope. This takes ~20 seconds.</p>
            </div>
          </div>
        )}

        {analyzeError && (
          <div className="border border-destructive/20 rounded-xl bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {analyzeError}
          </div>
        )}

        {/* ── Intelligence Results Panel ── */}
        {project.intelligenceResult && (() => {
          const intel = parseJSON<IntelligenceResult | null>(project.intelligenceResult, null);
          if (!intel) return null;

          const severityColor = (s: string) => ({
            critical: "text-red-400 bg-red-500/10 border-red-500/20",
            high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
            medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
            low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
          }[s] ?? "text-muted-foreground bg-muted border-border");

          return (
            <div className="border border-violet-500/20 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-violet-500/5">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-foreground">Intelligence Analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Scope risk:</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    intel.scopeRiskScore >= 8 ? "text-red-400 bg-red-500/10 border-red-500/20"
                    : intel.scopeRiskScore >= 5 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    {intel.scopeRiskScore}/10
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* Complexity assessment */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold">Assessment</p>
                  <p className="text-sm text-foreground leading-relaxed">{intel.overallComplexityAssessment}</p>
                </div>

                {/* Feasibility flags */}
                {intel.feasibilityFlags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Feasibility flags
                    </p>
                    <div className="space-y-2">
                      {intel.feasibilityFlags.map((f, i) => (
                        <div key={i} className={`rounded-lg border px-4 py-3 ${severityColor(f.severity)}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide">{f.severity}</span>
                            <span className="text-xs font-medium">{f.concern}</span>
                          </div>
                          <p className="text-xs opacity-80 leading-relaxed">{f.description}</p>
                          <p className="text-xs mt-1.5 font-medium">→ {f.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradictions */}
                {intel.contradictions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Contradictions
                    </p>
                    <div className="space-y-2">
                      {intel.contradictions.map((c, i) => (
                        <div key={i} className={`rounded-lg border px-4 py-3 ${severityColor(c.severity)}`}>
                          <p className="text-xs leading-relaxed mb-1.5">{c.description}</p>
                          <p className="text-xs font-medium">→ {c.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MVP vs Future Scope */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> MVP scope
                    </p>
                    <div className="space-y-1.5">
                      {intel.mvpScope.map((item, i) => (
                        <div key={i} className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
                          <p className="text-xs font-medium text-emerald-400">{item.feature}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                      <SplitSquareHorizontal className="w-3.5 h-3.5 text-muted-foreground" /> Future scope
                    </p>
                    <div className="space-y-1.5">
                      {intel.futureScope.map((item, i) => (
                        <div key={i} className="rounded-lg bg-muted/30 border border-border px-3 py-2">
                          <p className="text-xs font-medium text-muted-foreground">{item.feature}</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{item.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Architecture signals */}
                {intel.architectureSignals.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" /> Architecture signals
                    </p>
                    <div className="space-y-1">
                      {intel.architectureSignals.map((sig, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-violet-400 mt-0.5 shrink-0">→</span>
                          {sig}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inferred requirements */}
                {intel.inferredRequirements.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" /> Inferred requirements
                    </p>
                    <div className="space-y-2">
                      {intel.inferredRequirements.map((r, i) => (
                        <div key={i} className="rounded-lg bg-muted/20 border border-border px-3 py-2.5">
                          <p className="text-xs font-medium text-foreground">{r.requirement}</p>
                          <p className="text-xs text-muted-foreground mt-1">{r.architectureImpact}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${r.confidence * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground/60">{Math.round(r.confidence * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key risks */}
                {intel.keyRisks.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold">Key risks</p>
                    <div className="space-y-1">
                      {intel.keyRisks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-orange-400 mt-0.5 shrink-0">⚠</span>
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clarifications */}
                {intel.recommendedClarifications.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold">Recommended clarifications</p>
                    <div className="space-y-1">
                      {intel.recommendedClarifications.map((q, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-primary mt-0.5 shrink-0">?</span>
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proceed CTA */}
                {status === "analyzed" && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Review complete — proceed to classification</p>
                    <Link
                      href={`/projects/${id}/classify`}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity"
                    >
                      Classify intent <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── CTA when not complete (for statuses without inline panel) ── */}
        {!["discovery", "analyzing", "analyzed"].includes(status) && status !== "complete" && statusCfg.next && statusCfg.nextHref && (
          <div className="border border-primary/20 rounded-xl bg-primary/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">Ready to continue?</p>
              <p className="text-xs text-muted-foreground">
                {status === "classified" && "Architecture inference is next"}
                {status === "inferring" && "Your spec is ready to generate"}
              </p>
            </div>
            <Link
              href={statusCfg.nextHref(id)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity"
            >
              {statusCfg.nextLabel}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ── Classification card ── */}
        {classification && (
          <SectionCard title="System Blueprint" icon={Layers}>
            <div className="p-5 space-y-3">
              {classification.coreSystemSummary && (
                <p className="text-sm text-muted-foreground leading-relaxed">{classification.coreSystemSummary}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Product type", value: classification.complexityLabel },
                  { label: "Domain", value: classification.functionalDomain.replace(/_/g, " ") },
                  { label: "Execution", value: classification.executionStyle.replace(/_/g, " ") },
                  { label: "Complexity", value: `Level ${classification.complexityLevel} / 5` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/30 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm text-foreground font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {classification.requiresAiLayer && <span className="px-2 py-0.5 rounded text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">AI Layer</span>}
                {classification.requiresMultiTenancy && <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">Multi-tenant</span>}
                {classification.requiresMarketplace && <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Marketplace</span>}
              </div>
              {phases.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Build phases</p>
                  <div className="space-y-1">
                    {phases.map((phase, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {phase}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Architecture card ── */}
        {architecture && (
          <div className="space-y-3">
            {/* Complexity + timeline */}
            <SectionCard title="Technical complexity" icon={BarChart3}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div />
                  {architecture.estimatedBuildWeeks != null && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      ~{architecture.estimatedBuildWeeks} weeks to MVP
                    </div>
                  )}
                </div>
                {architecture.complexityScore != null && <ScoreBar score={architecture.complexityScore} />}
                {architecture.complexityRationale && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{architecture.complexityRationale}</p>
                )}
              </div>
            </SectionCard>

            {/* Stack */}
            {stack && (
              <SectionCard title="Recommended stack" icon={Cpu}>
                <div className="divide-y divide-border">
                  {[
                    { label: "Frontend", value: stack.frontend },
                    { label: "Backend", value: stack.backend },
                    { label: "Database", value: stack.database },
                    { label: "Auth", value: stack.auth },
                    { label: "Hosting", value: stack.hosting },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-4 px-5 py-3">
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
                      <span className="text-sm text-foreground">{value}</span>
                    </div>
                  ))}
                  {stack.additional.length > 0 && (
                    <div className="flex items-start gap-4 px-5 py-3">
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">Also</span>
                      <div className="flex flex-wrap gap-1.5">
                        {stack.additional.map((item) => (
                          <span key={item} className="px-2 py-0.5 rounded text-xs bg-muted border border-border text-muted-foreground">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Auth + DB */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {architecture.authStrategy && (
                <SectionCard title="Auth strategy" icon={Shield}>
                  <p className="text-sm text-muted-foreground leading-relaxed p-5">{architecture.authStrategy}</p>
                </SectionCard>
              )}
              {architecture.databaseDesign && (
                <SectionCard title="Database design" icon={Database}>
                  <p className="text-sm text-muted-foreground leading-relaxed p-5">{architecture.databaseDesign}</p>
                </SectionCard>
              )}
            </div>

            {/* Infrastructure */}
            {infra && (
              <SectionCard title="Infrastructure" icon={Globe}>
                <div className="divide-y divide-border">
                  {[
                    { label: "Hosting", value: infra.hosting },
                    { label: "CDN", value: infra.cdn },
                    { label: "Storage", value: infra.storage },
                    { label: "Jobs", value: infra.backgroundJobs },
                    infra.aiGateway ? { label: "AI Gateway", value: infra.aiGateway } : null,
                  ].filter(Boolean).map((row) => (
                    <div key={row!.label} className="flex items-start gap-4 px-5 py-3">
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">{row!.label}</span>
                      <span className="text-sm text-foreground">{row!.value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* APIs + Integrations */}
            {(apis.length > 0 || integrations.length > 0) && (
              <SectionCard title="APIs & integrations" icon={Plug}>
                <div className="p-5 flex flex-wrap gap-1.5">
                  {[...apis, ...integrations].map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-md text-xs bg-muted border border-border text-muted-foreground">{item}</span>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Key risks */}
            {risks.length > 0 && (
              <SectionCard title="Key risks" icon={AlertTriangle}>
                <ul className="p-5 space-y-2">
                  {risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        )}

        {/* ── Empty states per stage ── */}
        {!classification && session && (
          <div className="border border-border rounded-xl bg-muted/10 p-8 text-center">
            <Server className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Blueprint not yet generated — complete discovery first.</p>
          </div>
        )}

      </div>
    </div>
  );
}
