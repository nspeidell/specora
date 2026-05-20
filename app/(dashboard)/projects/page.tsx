"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  ChevronRight,
  Clock,
  Zap,
  CheckCircle2,
  Layers,
  Server,
  RefreshCw,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  createdAt: number | null;
  updatedAt: number | null;
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType; cta: string; href: (id: string) => string }> = {
  draft:      { label: "Draft",              color: "bg-muted text-muted-foreground",         icon: FolderOpen,   cta: "Continue",           href: (id) => `/projects/${id}` },
  discovery:  { label: "In discovery",       color: "bg-blue-500/10 text-blue-400",           icon: Layers,       cta: "Continue discovery", href: (id) => `/projects/${id}/discover` },
  classified: { label: "Blueprint ready",    color: "bg-violet-500/10 text-violet-400",       icon: Layers,       cta: "View architecture",  href: (id) => `/projects/${id}/infer` },
  inferring:  { label: "Architecture ready", color: "bg-amber-500/10 text-amber-400",         icon: Server,       cta: "Generate spec",      href: (id) => `/projects/${id}/generate` },
  complete:   { label: "Complete",           color: "bg-emerald-500/10 text-emerald-400",     icon: CheckCircle2, cta: "View spec",          href: (id) => `/projects/${id}` },
  archived:   { label: "Archived",           color: "bg-muted text-muted-foreground/60",      icon: FolderOpen,   cta: "View",               href: (id) => `/projects/${id}` },
};

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts * 1000;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function ProjectCard({ project }: { project: Project }) {
  const status = project.status ?? "draft";
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors flex flex-col gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{project.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(project.updatedAt ?? project.createdAt)}
        </span>
        <Link
          href={meta.href(project.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted/60 transition text-foreground"
        >
          {meta.cta}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  const complete = projects.filter((p) => p.status === "complete");
  const inProgress = projects.filter((p) => p.status !== "complete" && p.status !== "archived");
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted/60 transition text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New project
          </Link>
        </div>
      </div>

      {error && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 text-sm text-destructive mb-6">{error}</div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-3" />
              <div className="h-4 bg-muted rounded w-40 mb-2" />
              <div className="h-3 bg-muted rounded w-full mb-1" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="border border-border rounded-xl bg-muted/10 py-16 text-center">
          <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground mb-5">
            Create your first project to get a full AI implementation blueprint.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity"
          >
            <Zap className="w-4 h-4" />
            Start building
          </Link>
        </div>
      )}

      {!loading && inProgress.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">In progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgress.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {!loading && complete.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Complete</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {complete.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {!loading && archived.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Archived</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archived.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
