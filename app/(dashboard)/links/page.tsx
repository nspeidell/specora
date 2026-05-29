"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

type DiscoveryLink = {
  id: string;
  token: string;
  projectName: string;
  clientName: string | null;
  clientEmail: string | null;
  status: "pending" | "in_progress" | "completed" | "expired";
  projectId: string | null;
  createdAt: number | null;
  updatedAt: number | null;
};

const STATUS_META: Record<
  DiscoveryLink["status"],
  { label: string; icon: typeof Circle; color: string }
> = {
  pending: {
    label: "Awaiting client",
    icon: Circle,
    color: "text-muted-foreground",
  },
  in_progress: {
    label: "In progress",
    icon: Clock,
    color: "text-yellow-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-400",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    color: "text-destructive",
  },
};

function timeAgo(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts * 1000;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Create Link Modal ─────────────────────────────────────────

function CreateLinkModal({
  onClose,
  onCreated,
  appUrl,
}: {
  onClose: () => void;
  onCreated: (link: DiscoveryLink) => void;
  appUrl: string;
}) {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    token: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!projectName.trim()) {
      setError("Project / engagement name is required.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/interview/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          clientName: clientName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error || "Failed to create link.");
        return;
      }
      const data = await res.json() as { token: string; url: string; id: string };
      setResult({ token: data.token, url: data.url });
      onCreated({
        id: data.id,
        token: data.token,
        projectName: projectName.trim(),
        clientName: clientName.trim() || null,
        clientEmail: clientEmail.trim() || null,
        status: "pending",
        projectId: null,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function copyUrl() {
    if (!result) return;
    const full = `${appUrl}/interview/${result.token}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        {!result ? (
          <>
            <h2 className="text-lg font-semibold mb-1">New discovery link</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Creates a shareable URL. Your client fills it out — no login
              required.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Engagement name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Acme Corp — Platform Rebuild"
                  className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60 transition"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Client name (optional)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60 transition"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Client email (optional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g. sarah@acmecorp.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60 transition"
                />
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm mt-3">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 rounded-lg gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Generate link"
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Link created</div>
                <div className="text-xs text-muted-foreground">
                  Share this URL with your client
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3 mb-6 font-terminal text-sm break-all">
              <span className="text-foreground">
                {appUrl}/interview/{result.token}
              </span>
              <button
                type="button"
                onClick={copyUrl}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-lg gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function LinksPage() {
  const [links, setLinks] = useState<DiscoveryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://specora.app";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/interview/links");
        if (res.ok) {
          const data = await res.json() as { links: DiscoveryLink[] };
          setLinks(data.links);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(`${appUrl}/interview/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-1">
            Discovery Links
          </h1>
          <p className="text-sm text-muted-foreground">
            Shareable client interview links. No login required for clients.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New link
        </button>
      </div>

      {/* Link list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <div className="text-muted-foreground text-sm mb-4">
            No discovery links yet.
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create your first link
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const meta = STATUS_META[link.status] ?? STATUS_META.pending;
            const StatusIcon = meta.icon;
            return (
              <div
                key={link.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:border-border/80 transition-colors"
              >
                <StatusIcon className={`w-4 h-4 shrink-0 ${meta.color}`} />

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {link.projectName}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xs ${meta.color}`}>
                      {meta.label}
                    </span>
                    {link.clientName && (
                      <span className="text-xs text-muted-foreground">
                        · {link.clientName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      · {timeAgo(link.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Copy link */}
                  <button
                    type="button"
                    onClick={() => copyLink(link.token, link.id)}
                    title="Copy interview link"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {copiedId === link.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* Open in new tab */}
                  <a
                    href={`/interview/${link.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Preview interview"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* Go to project (if exists) */}
                  {link.projectId && link.status === "completed" && (
                    <Link
                      href={`/projects/${link.projectId}`}
                      title="Go to project"
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateLinkModal
          appUrl={appUrl}
          onClose={() => setShowCreate(false)}
          onCreated={(link) => {
            setLinks((prev) => [link, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
