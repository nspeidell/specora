import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, count } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import { users, projects, generatedSpecifications } from "@/lib/db/schema";
import Link from "next/link";
import {
  Zap,
  FolderOpen,
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  Layers,
  Server,
} from "lucide-react";

function timeAgo(ts: number | Date | null): string {
  if (!ts) return "";
  const ms = ts instanceof Date ? ts.getTime() : ts * 1000;
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType; href: (id: string) => string; cta: string }> = {
  draft:      { label: "Draft",              color: "text-muted-foreground", icon: FolderOpen,   href: (id) => `/projects/${id}`,         cta: "Open" },
  discovery:  { label: "In discovery",       color: "text-blue-400",         icon: Layers,       href: (id) => `/projects/${id}/discover`, cta: "Continue" },
  classified: { label: "Blueprint ready",    color: "text-violet-400",       icon: Layers,       href: (id) => `/projects/${id}/infer`,    cta: "View arch" },
  inferring:  { label: "Architecture ready", color: "text-amber-400",        icon: Server,       href: (id) => `/projects/${id}/generate`, cta: "Generate" },
  complete:   { label: "Complete",           color: "text-emerald-400",      icon: CheckCircle2, href: (id) => `/projects/${id}`,          cta: "View spec" },
};

export default async function DashboardPage() {
  const { userId: clerkUserId } = await auth();

  let userProjects: { id: string; name: string; status: string | null; createdAt: Date | null; updatedAt: Date | null }[] = [];
  let totalSpecs = 0;

  try {
    const { env } = await getCloudflareContext();
    const db = getDB(env as { DB: D1Database });

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId!))
      .limit(1);

    if (user) {
      const [allProjects, specCount] = await Promise.all([
        db
          .select({ id: projects.id, name: projects.name, status: projects.status, createdAt: projects.createdAt, updatedAt: projects.updatedAt })
          .from(projects)
          .where(eq(projects.ownerId, user.id))
          .orderBy(projects.updatedAt),
        db
          .select({ count: count() })
          .from(generatedSpecifications)
          .where(eq(generatedSpecifications.userId, user.id)),
      ]);
      userProjects = [...allProjects].reverse();
      totalSpecs = specCount[0]?.count ?? 0;
    }
  } catch {
    // Silently degrade — dashboard still renders with zeros
  }

  const recentProjects = userProjects.slice(0, 5);
  const completeCount = userProjects.filter((p) => p.status === "complete").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Welcome to Specora</h1>
        <p className="text-muted-foreground text-sm">
          Turn your business idea into an AI-executable software blueprint.
        </p>
      </div>

      {/* First-time CTA */}
      {userProjects.length === 0 && (
        <div className="glass rounded-xl p-6 mb-6 border border-brand/20 relative overflow-hidden">
          <div className="absolute inset-0 gradient-brand opacity-5 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-brand" />
              <span className="text-sm font-medium text-brand">Get started</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Create your first project</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Answer a few guided questions about your idea and Specora will generate a full implementation blueprint — ready for Claude Code, Cursor, or Windsurf.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity glow-brand"
            >
              Start building
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Projects",        value: userProjects.length },
          { label: "Specs generated", value: totalSpecs },
          { label: "Complete",        value: completeCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-lg px-4 py-4">
            <p className="text-2xl font-semibold text-foreground mb-0.5">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recent projects</span>
          </div>
          <div className="flex items-center gap-3">
            {userProjects.length > 0 && (
              <Link href="/projects/new" className="text-xs font-medium text-brand hover:opacity-80 transition-opacity flex items-center gap-1">
                <Zap className="w-3 h-3" /> New
              </Link>
            )}
            {userProjects.length > 5 && (
              <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {recentProjects.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No projects yet.{" "}
              <Link href="/projects/new" className="text-brand hover:underline">Create your first one →</Link>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentProjects.map((project) => {
              const status = project.status ?? "draft";
              const meta = STATUS_META[status] ?? STATUS_META.draft;
              const Icon = meta.icon;
              return (
                <div key={project.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                      <p className={`text-xs ${meta.color}`}>{meta.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground/50 hidden sm:flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(project.updatedAt ?? project.createdAt)}
                    </span>
                    <Link
                      href={meta.href(project.id)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {meta.cta}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {userProjects.length > 5 && (
          <div className="px-5 py-3 border-t border-border">
            <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all {userProjects.length} projects <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
