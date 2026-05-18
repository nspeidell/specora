"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Loader2 } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push(`/projects/${data.projectId}/discover`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="min-h-full flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-brand glow-brand">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              New project
            </h1>
            <p className="text-xs text-muted-foreground">
              Step 1 of 3 — Project basics
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Project name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TalentMatch, BudgetBuddy, CreatorOS"
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              What does it do?
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Describe your idea in plain language. Don&apos;t worry about
              technical details — that&apos;s what Specora is for.
            </p>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A platform that connects freelance designers with early-stage startups. Startups post briefs, designers apply, and the platform handles contracts, milestones, and payments."
              maxLength={2000}
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition resize-none"
            />
            <p className="text-xs text-muted-foreground/60 mt-1 text-right">
              {description.length}/2000
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating project…
              </>
            ) : (
              <>
                Start discovery
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground/60 text-center">
          Next: Specora will ask you ~12 guided questions to understand your
          product deeply.
        </p>
      </div>
    </div>
  );
}
