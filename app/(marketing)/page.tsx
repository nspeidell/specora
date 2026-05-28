import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Brain,
  FileCode2,
  Layers,
  Rocket,
  MessageSquare,
  Database,
  GitBranch,
  Zap,
  ChevronDown,
} from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <>
      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20">
        {/* Background glow */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.66 0.22 286 / 18%), transparent)",
          }}
        />

        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/8 text-brand text-xs font-medium mb-8">
              <Zap className="w-3 h-3" />
              AI-powered build specifications
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Turn Business Ideas Into{" "}
              <span
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.66 0.22 286), oklch(0.68 0.20 220))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AI-Executable Software Blueprints
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
              Transform messy entrepreneur thinking into structured
              architecture, implementation plans, and AI-ready build
              specifications. Built for founders who want to ship — not spend
              weeks writing docs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity glow-brand"
              >
                Generate My Build Specification
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#example"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground hover:border-border/80 transition-colors"
              >
                View example output
              </Link>
            </div>
          </div>

          {/* Spec preview */}
          <div
            id="example"
            className="relative max-w-4xl mx-auto rounded-2xl border border-border/60 overflow-hidden shadow-2xl"
            style={{
              background: "oklch(0.10 0.014 286)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-chart-3/60" />
              <span className="ml-3 text-xs text-muted-foreground font-terminal">
                agency-crm-spec.md
              </span>
            </div>

            {/* Content */}
            <div className="p-6 font-terminal text-sm leading-relaxed overflow-hidden">
              <div className="text-brand font-semibold mb-4">
                # SYSTEM BLUEPRINT CLASSIFICATION
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-6 text-muted-foreground">
                <div>
                  <span className="text-foreground/50">Product Type:    </span>
                  <span className="text-electric">SaaS Application</span>
                </div>
                <div>
                  <span className="text-foreground/50">Complexity:      </span>
                  <span className="text-electric">
                    Level 3 — Multi-tenant SaaS
                  </span>
                </div>
                <div>
                  <span className="text-foreground/50">Domain:          </span>
                  <span className="text-electric">Sales / CRM</span>
                </div>
                <div>
                  <span className="text-foreground/50">Build Style:     </span>
                  <span className="text-electric">Scalable SaaS</span>
                </div>
              </div>

              <div className="text-brand font-semibold mb-3">
                ## RECOMMENDED STACK
              </div>
              <div className="space-y-1 mb-6 text-muted-foreground">
                <div>
                  <span className="text-foreground/40">Frontend:   </span>
                  Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui
                </div>
                <div>
                  <span className="text-foreground/40">Backend:    </span>
                  Cloudflare Workers · D1 Database · Queues
                </div>
                <div>
                  <span className="text-foreground/40">Auth:       </span>
                  Clerk (multi-tenant Organizations + RBAC)
                </div>
                <div>
                  <span className="text-foreground/40">Payments:   </span>
                  Stripe Billing · Subscription webhooks
                </div>
                <div>
                  <span className="text-foreground/40">AI Layer:   </span>
                  Anthropic Claude · Cloudflare AI Gateway
                </div>
              </div>

              <div className="text-brand font-semibold mb-3">
                ## DATABASE SCHEMA (excerpt)
              </div>
              <div className="space-y-0.5 text-muted-foreground">
                <div className="text-foreground/40">
                  CREATE TABLE organizations (
                </div>
                <div className="pl-4">
                  id TEXT PRIMARY KEY,
                </div>
                <div className="pl-4">
                  name TEXT NOT NULL,
                </div>
                <div className="pl-4">
                  clerk_org_id TEXT UNIQUE,
                </div>
                <div className="pl-4">
                  subscription_tier TEXT DEFAULT{" "}
                  <span className="text-chart-3">'free'</span>,
                </div>
                <div className="text-foreground/40">);</div>
                <div className="mt-2 text-foreground/40">
                  CREATE TABLE deals (
                </div>
                <div className="pl-4">
                  id TEXT PRIMARY KEY,
                </div>
                <div className="pl-4">
                  org_id TEXT REFERENCES organizations(id),
                </div>
                <div className="pl-4">
                  stage TEXT DEFAULT{" "}
                  <span className="text-chart-3">'prospecting'</span>,
                </div>
                <div className="pl-4">
                  value REAL, assigned_to TEXT, ...
                </div>
                <div className="text-foreground/40">);</div>
              </div>

              {/* Fade out */}
              <div
                className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, oklch(0.10 0.014 286))",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PROBLEM
          ============================================================ */}
      <section className="px-6 py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              AI coding tools are powerful.{" "}
              <span className="text-muted-foreground">
                Vague prompts are not.
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Claude Code, Cursor, and Windsurf can build almost anything — but
              only when they know exactly what to build. Most founders hand them
              a paragraph and wonder why the output is wrong.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: "Without Specora",
                items: [
                  "Vague prompts → wrong architecture",
                  "Hours debugging decisions that should be planned",
                  "Rebuild from scratch when scope shifts",
                  "AI agent makes up database design",
                  "No sprint plan — just chaos",
                ],
                bad: true,
              },
              {
                label: "What Specora produces",
                items: [
                  "Classified product type + complexity tier",
                  "Full technology stack with rationale",
                  "Complete database schema (real SQL)",
                  "Every API endpoint documented",
                  "Taskized sprint plan — one task per AI prompt",
                ],
                bad: false,
              },
              {
                label: "What you ship",
                items: [
                  "Architecture Claude Code can execute on day 1",
                  "No re-work from wrong assumptions",
                  "Consistent decisions across every file",
                  "Non-technical founders in full control",
                  "From idea to buildable spec in under 10 minutes",
                ],
                bad: false,
              },
            ].map((col) => (
              <div
                key={col.label}
                className={`rounded-xl border p-6 ${
                  col.bad
                    ? "border-destructive/20 bg-destructive/5"
                    : "border-brand/20 bg-brand/5"
                }`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
                    col.bad ? "text-destructive" : "text-brand"
                  }`}
                >
                  {col.label}
                </div>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className={`mt-0.5 shrink-0 text-base leading-none ${
                          col.bad ? "text-destructive" : "text-brand"
                        }`}
                      >
                        {col.bad ? "✕" : "✓"}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section id="how-it-works" className="px-6 py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">
              How it works
            </div>
            <h2 className="text-3xl font-bold mb-4">
              From idea to executable blueprint in minutes
            </h2>
            <p className="text-muted-foreground">
              No technical knowledge required. Just describe what you want to
              build.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: MessageSquare,
                title: "Describe your idea",
                description:
                  "Answer a guided set of questions about your product — what it does, who it's for, how it makes money, and what features matter. No technical knowledge needed.",
              },
              {
                step: "02",
                icon: Brain,
                title: "AI classifies and infers",
                description:
                  "Specora's AI classifies your product across 4 dimensions, then infers the optimal technology stack, database design, auth strategy, and scaling model.",
              },
              {
                step: "03",
                icon: FileCode2,
                title: "Get your build spec",
                description:
                  "Receive a complete, implementation-ready blueprint: full database schema, every API endpoint, a taskized sprint plan, and AI coding instructions for Claude Code, Cursor, or Windsurf.",
              },
            ].map((step, i) => (
              <div key={step.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px border-t border-dashed border-border/60 -translate-x-4 z-10" />
                )}
                <div className="relative z-20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shrink-0">
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Step {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          WHAT YOU GET
          ============================================================ */}
      <section className="px-6 py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">
              What's included
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Every section your AI coding tool needs
            </h2>
            <p className="text-muted-foreground">
              Specora doesn't just give you a description. It gives you the
              complete contract your AI agent needs to build correctly.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Layers,
                title: "Intent Classification",
                desc: "Product type, complexity tier, functional domain, and execution style — the 4-dimension contract that makes every downstream decision correct.",
              },
              {
                icon: Database,
                title: "Complete Database Schema",
                desc: "Full SQL with every table, column type, index, and foreign key. Not pseudocode — actual CREATE TABLE statements your agent can run.",
              },
              {
                icon: FileCode2,
                title: "API Structure",
                desc: "Every endpoint documented: method, path, request shape, response shape, and auth requirements. No guessing.",
              },
              {
                icon: Brain,
                title: "Architecture Decisions",
                desc: "Not just what to build — why. Every major technical choice includes rationale so your AI agent doesn't second-guess itself.",
              },
              {
                icon: GitBranch,
                title: "Taskized Sprint Plan",
                desc: "Broken into discrete, executable tasks — one Claude Code prompt's worth of work per task, with validation criteria.",
              },
              {
                icon: Rocket,
                title: "AI Coding Instructions",
                desc: "Optimized specifically for Claude Code, Cursor, and Windsurf. File-by-file build order with exact commands and outputs.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border/60 bg-card p-5 hover:border-brand/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center mb-4">
                  <feature.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <section id="pricing" className="px-6 py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">
              Pricing
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Start free. Scale when you ship.
            </h2>
            <p className="text-muted-foreground">
              Your first specification is free — no credit card required. Upgrade
              when you're ready to build more.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                specs: "1 specification",
                highlight: false,
                cta: "Start free",
                href: "/sign-up",
                features: [
                  "1 build specification",
                  "All 3 output documents",
                  "Tech spec + brand plan + marketing plan",
                  "Markdown export",
                ],
              },
              {
                name: "Pro",
                price: "$79",
                period: "/ month",
                specs: "20 specifications / mo",
                highlight: true,
                cta: "Get started",
                href: "/sign-up",
                features: [
                  "20 build specifications / month",
                  "All output formats (MD, JSON, PDF)",
                  "Spec versioning",
                  "Priority AI generation",
                  "Launchpad module (coming soon)",
                ],
              },
              {
                name: "Agency",
                price: "$199",
                period: "/ month",
                specs: "Unlimited specifications",
                highlight: false,
                cta: "Get started",
                href: "/sign-up",
                features: [
                  "Unlimited build specifications",
                  "Team collaboration",
                  "Client project workspaces",
                  "Everything in Pro",
                  "Priority support",
                ],
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  tier.highlight
                    ? "border-brand/60 bg-brand/8 relative"
                    : "border-border/60 bg-card"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-brand text-white text-xs font-semibold">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-sm font-semibold text-muted-foreground mb-1">
                    {tier.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground text-sm">
                      {tier.period}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tier.specs}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-opacity ${
                    tier.highlight
                      ? "gradient-brand text-white hover:opacity-90"
                      : "border border-border hover:border-brand/40 text-foreground hover:text-brand transition-colors"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ
          ============================================================ */}
      <section id="faq" className="px-6 py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">
              FAQ
            </div>
            <h2 className="text-3xl font-bold">Common questions</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-2">
            {[
              {
                q: "Do I need to be technical to use Specora?",
                a: "No. Specora is built for non-technical founders. You describe your idea in plain language — Specora handles all the architectural translation. The output is technical, but creating it doesn't require technical knowledge.",
              },
              {
                q: "What AI coding tools work with the output?",
                a: "The specifications are optimized for Claude Code, Cursor, and Windsurf. Any AI coding agent that can read a markdown document will benefit — the structure and taskization are designed to map directly to how these tools consume instructions.",
              },
              {
                q: "How is this different from just prompting Claude directly?",
                a: "Prompting Claude directly gives you prose. Specora gives you a structured, classified, versioned artifact. The classification system ensures every section of the spec is tailored to your actual product type — a marketplace gets different architecture advice than a SaaS app. That specificity is what makes the output executable.",
              },
              {
                q: "What does the free tier include?",
                a: "One complete build specification with all three output documents: technical spec, brand plan, and marketing plan. No credit card required. It's a real output on your real idea, not a demo.",
              },
              {
                q: "Can I regenerate a spec if my idea evolves?",
                a: "Yes. Each generation creates a new versioned artifact. You can re-run discovery, update your answers, and regenerate — the system tracks what changed between versions.",
              },
              {
                q: "How long does generation take?",
                a: "Most specs generate in under 2 minutes. The process runs three sequential AI calls: technical architecture, brand positioning, and go-to-market plan. You see progress in real time.",
              },
              {
                q: "Is the output really implementation-ready?",
                a: "It's as close as a specification can get. You get real SQL for the database schema, real API endpoint definitions, a real file tree, and real CLI commands — not placeholder pseudocode. An experienced developer or AI coding agent can start building immediately from the output.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border/60 bg-card overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none text-sm font-medium hover:text-brand transition-colors">
                  {item.q}
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="px-6 py-24 border-t border-border/40">
        <div
          className="max-w-3xl mx-auto rounded-2xl border border-brand/30 p-12 text-center relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.66 0.22 286 / 12%), transparent), oklch(0.115 0.018 286)",
          }}
        >
          <h2 className="text-4xl font-bold mb-4">
            Your idea deserves a real blueprint.
          </h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-lg mx-auto">
            Stop guessing what to tell your AI coding agent. Generate a
            complete, structured, implementation-ready build specification in
            minutes — for free.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity glow-brand"
          >
            Generate My Build Specification
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Free forever · No credit card · Ready in minutes
          </p>
        </div>
      </section>
    </>
  );
}
