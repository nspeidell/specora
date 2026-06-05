"use client";

import { use, useEffect, useState } from "react";
import {
  FileText,
  Palette,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  GitBranch,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

type SpecVersion = {
  id: string;
  fullSpecMarkdown: string | null;
  fullSpecJson: string | null;
  versionNumber: string;
  createdAt: string | number | null;
};

type GeneratedSpec = {
  id: string;
  status: string;
};

type ParsedDocs = {
  techSpec: string;
  operationalArchitecture: string;
  scopeAnalysis: string;
  brandPlan: string;
  gtmPlan: string;
};

type TabId = "tech" | "operational" | "scope" | "brand" | "gtm";

// ─── Loading steps ────────────────────────────────────────────
// Parallel generation: all calls fire simultaneously — ~20s total

const LOADING_STEPS = [
  { label: "Loading project data…",                     duration: 0 },
  { label: "Compiling discovery responses…",            duration: 2000 },
  { label: "Generating technical spec in parallel…",    duration: 5000 },
  { label: "Extracting operational architecture…",      duration: 8000 },
  { label: "Defining MVP scope and phase plan…",        duration: 11000 },
  { label: "Finalizing all documents…",                 duration: 16000 },
];

// ─── Markdown renderer (no external deps) ────────────────────

function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-foreground mt-8 mb-3 border-b border-border pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-2 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs bg-muted border border-border font-mono text-foreground">$1</code>')
    // Code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-muted border border-border rounded-lg p-4 overflow-x-auto my-4 text-xs font-mono text-foreground leading-relaxed"><code>$1</code></pre>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 text-sm text-muted-foreground leading-relaxed"><span class="text-primary mt-1 shrink-0">•</span><span>$1</span></li>')
    // Ordered lists — wrap items
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-muted-foreground leading-relaxed pl-1">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-border my-6" />')
    // Paragraphs (lines that aren't already HTML)
    .replace(/^(?!<)(.+)$/gm, '<p class="text-sm text-muted-foreground leading-relaxed mb-2">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, '')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
      if (match.includes('flex gap-2')) {
        return `<ul class="space-y-1.5 my-3">${match}</ul>`;
      }
      return `<ol class="list-decimal list-inside space-y-1.5 my-3 text-sm text-muted-foreground">${match}</ol>`;
    });
}

// ─── Copy button ──────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted/80 transition text-muted-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Download button ──────────────────────────────────────────

function DownloadButton({ content, filename, label }: { content: string; filename: string; label: string }) {
  function handleDownload() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted/80 transition text-muted-foreground"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ─── Tab definition ───────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof FileText; description: string }[] = [
  { id: "tech",         label: "Tech Spec",    icon: FileText,   description: "Implementation guide for Claude Code / Cursor — stack, schema, API, sprint plan, CLAUDE.md" },
  { id: "operational",  label: "Operational",  icon: Layers,     description: "User roles, permissions, workflows, admin design, automation, event system" },
  { id: "scope",        label: "Scope Plan",   icon: GitBranch,  description: "MVP vs future scope, phased build plan, risk register, success criteria" },
  { id: "brand",        label: "Brand",        icon: Palette,    description: "Identity, voice, color palette, typography, and visual system" },
  { id: "gtm",          label: "GTM",          icon: TrendingUp, description: "Go-to-market strategy, positioning, and launch playbook" },
];

// ─── Main page ────────────────────────────────────────────────

export default function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [loadingStep, setLoadingStep] = useState(0);
  const [startTime] = useState(Date.now());
  const [docs, setDocs] = useState<ParsedDocs | null>(null);
  const [version, setVersion] = useState<SpecVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("tech");
  const [retryKey, setRetryKey] = useState(0);

  // Animate loading steps based on elapsed time
  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let nextStep = 0;
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        if (elapsed >= LOADING_STEPS[i].duration) nextStep = i;
      }
      setLoadingStep(nextStep);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

  // Generate spec
  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.detail ?? data.error ?? "Generation failed.");
          setStatus("error");
          return;
        }

        const ver = data.version as SpecVersion;
        if (!ver) {
          setError("No version data returned.");
          setStatus("error");
          return;
        }

        // Parse the three documents
        let parsed: ParsedDocs = { techSpec: "", operationalArchitecture: "", scopeAnalysis: "", brandPlan: "", gtmPlan: "" };
        if (ver.fullSpecJson) {
          try {
            parsed = JSON.parse(ver.fullSpecJson);
          } catch {
            // fallback: tech spec only
            parsed.techSpec = ver.fullSpecMarkdown ?? "";
          }
        } else if (ver.fullSpecMarkdown) {
          parsed.techSpec = ver.fullSpecMarkdown;
        }

        setDocs(parsed);
        setVersion(ver);
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [id, retryKey]);

  // ── Loading ────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-brand glow-brand mx-auto mb-6">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Generating your spec
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Generating all documents in parallel. This takes 20–30 seconds.
          </p>
          <div className="space-y-2 text-left bg-muted/30 border border-border rounded-lg p-4">
            {LOADING_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2.5 text-sm">
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
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/50">
            Don't close this tab — generation is in progress.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Generation failed</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => {
              setStatus("loading");
              setLoadingStep(0);
              setError(null);
              setRetryKey((k) => k + 1);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-muted border border-border hover:bg-muted/80 transition mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!docs) return null;

  const tabContent: Record<TabId, string> = {
    tech:        docs.techSpec,
    operational: docs.operationalArchitecture,
    scope:       docs.scopeAnalysis,
    brand:       docs.brandPlan,
    gtm:         docs.gtmPlan,
  };

  const tabFilenames: Record<TabId, string> = {
    tech:        "tech-spec.md",
    operational: "operational-architecture.md",
    scope:       "scope-analysis.md",
    brand:       "brand-plan.md",
    gtm:         "gtm-plan.md",
  };

  const activeContent = tabContent[activeTab];

  // ── Result ────────────────────────────────────────────────
  return (
    <div className="min-h-full flex items-start justify-center pt-8 px-4 pb-16">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-brand glow-brand">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Spec Generated
            </h1>
            <p className="text-xs text-muted-foreground">
              v{version?.versionNumber ?? "1.0.0"} · Three documents ready
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/30 border border-border rounded-xl mb-4">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
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

        {/* Tab description + actions */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">
            {TABS.find((t) => t.id === activeTab)?.description}
          </p>
          <div className="flex items-center gap-2">
            <CopyButton text={activeContent} />
            <DownloadButton
              content={activeContent}
              filename={tabFilenames[activeTab]}
              label="Download .md"
            />
          </div>
        </div>

        {/* Document content */}
        <div className="border border-border rounded-xl bg-background overflow-hidden">
          {activeContent ? (
            <div
              className="p-6 prose-custom"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeContent) }}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No content generated for this document.
            </div>
          )}
        </div>

        {/* Download all */}
        <div className="mt-6 border border-border rounded-xl bg-muted/10 p-5">
          <p className="text-sm font-medium text-foreground mb-3">Download all documents</p>
          <div className="flex flex-wrap gap-2">
            <DownloadButton content={docs.techSpec} filename="tech-spec.md" label="Tech Spec" />
            <DownloadButton content={docs.operationalArchitecture} filename="operational-architecture.md" label="Operational" />
            <DownloadButton content={docs.scopeAnalysis} filename="scope-analysis.md" label="Scope Plan" />
            {docs.brandPlan && <DownloadButton content={docs.brandPlan} filename="brand-plan.md" label="Brand" />}
            {docs.gtmPlan && <DownloadButton content={docs.gtmPlan} filename="gtm-plan.md" label="GTM" />}
          </div>
          <p className="mt-3 text-xs text-muted-foreground/60">
            These Markdown files can be pasted directly into Claude Code, Cursor, or Windsurf to start your build.
          </p>
        </div>

        {/* Next steps */}
        <div className="mt-4 border border-border rounded-xl bg-muted/10 p-5">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-primary" />
            Next steps
          </p>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <span className="text-primary font-semibold shrink-0">1.</span>
              Download the <strong className="text-foreground font-medium">Tech Spec</strong> and paste it as your first message in Claude Code or Cursor.
            </li>
            <li className="flex gap-2.5">
              <span className="text-primary font-semibold shrink-0">2.</span>
              Share the <strong className="text-foreground font-medium">Brand Plan</strong> with your designer (or use it to generate assets with Midjourney / Figma).
            </li>
            <li className="flex gap-2.5">
              <span className="text-primary font-semibold shrink-0">3.</span>
              Follow the <strong className="text-foreground font-medium">Marketing Plan</strong> 90-day roadmap starting on your launch day.
            </li>
          </ol>
        </div>

      </div>
    </div>
  );
}
