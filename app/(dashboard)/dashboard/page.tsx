import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Zap, FolderOpen, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Hero greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Welcome to Specora
        </h1>
        <p className="text-muted-foreground text-sm">
          Turn your business idea into an AI-executable software blueprint.
        </p>
      </div>

      {/* Quick-start CTA */}
      <div className="glass rounded-xl p-6 mb-6 border border-brand/20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-brand">Get started</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Create your first project
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Answer a few guided questions about your idea and Specora will
            generate a full implementation blueprint — ready for Claude Code,
            Cursor, or Windsurf.
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

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Projects", value: "0" },
          { label: "Specs generated", value: "0" },
          { label: "Generations left", value: "1" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-lg px-4 py-4"
          >
            <p className="text-2xl font-semibold text-foreground mb-0.5">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent projects placeholder */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Recent projects
            </span>
          </div>
          <Link
            href="/projects"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No projects yet.{" "}
            <Link href="/projects/new" className="text-brand hover:underline">
              Create your first one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
