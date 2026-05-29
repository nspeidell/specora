// ============================================================
// SPEC GENERATION PROMPTS — v2.0.0
// CTO-as-a-Service Requirements Translation Engine
//
// Output: Single dense implementation spec optimized for
// autonomous coding tools (Claude Code, Cursor, Windsurf).
// No marketing copy. No brand fluff. Engineering signal only.
// ============================================================

import { z } from "zod";

export const SPEC_GENERATION_PROMPT_VERSION = "2.0.0";

// ── Input Types ───────────────────────────────────────────────

export type ClassificationInput = {
  productType: string;
  complexityLevel: number;
  complexityLabel: string;
  functionalDomain: string;
  executionStyle: string;
  targetUsers: string;
  coreSystemSummary: string;
  requiresAiLayer: boolean;
  requiresMultiTenancy: boolean;
  requiresMarketplace: boolean;
  classificationRationale: string;
  phaseTemplate: string[];
};

export type ArchitectureInput = {
  recommendedStack: {
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    hosting: string;
    additional: string[];
  };
  authStrategy: string;
  databaseDesign: string;
  infrastructure: {
    hosting: string;
    cdn: string;
    storage: string;
    backgroundJobs: string;
    aiGateway?: string;
  };
  recommendedApis: string[];
  recommendedIntegrations: string[];
  scalingConsiderations: string;
  complexityScore: number;
  complexityRationale: string;
  estimatedBuildWeeks: number;
  keyRisks: string[];
  aiLayerDesign?: string;
  multiTenancyDesign?: string;
  marketplaceDesign?: string;
};

export type DiscoveryResponse = {
  questionKey: string;
  questionText: string;
  responseText: string;
  stepNumber: number;
};

// ── Output Schemas ────────────────────────────────────────────

export const TechSpecResultSchema = z.object({
  fullMarkdown: z
    .string()
    .describe(
      "Complete implementation-ready technical specification as dense Markdown. No preamble. Starts with # heading."
    ),
});

export const BrandPlanResultSchema = z.object({
  fullMarkdown: z
    .string()
    .describe(
      "Brand identity plan as Markdown. Covers positioning, voice, palette, type, and asset checklist."
    ),
});

export const MarketingPlanResultSchema = z.object({
  fullMarkdown: z
    .string()
    .describe(
      "Go-to-market plan as Markdown. Covers positioning, channels, launch plan, and 90-day roadmap."
    ),
});

// ── Helpers ───────────────────────────────────────────────────

function formatResponses(responses: DiscoveryResponse[]): string {
  return responses
    .map((r) => `Q: ${r.questionText}\nA: ${r.responseText}`)
    .join("\n\n");
}

function getResponseValue(
  responses: DiscoveryResponse[],
  key: string
): string {
  return responses.find((r) => r.questionKey === key)?.responseText ?? "";
}

// ── TECH SPEC PROMPT (Primary) ────────────────────────────────
//
// This is the core deliverable. Dense, precise, implementation-ready.
// Every section must be actionable by an autonomous coding agent.

export function buildTechSpecPrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationInput,
  architecture: ArchitectureInput,
  responses: DiscoveryResponse[]
): string {
  const stack = architecture.recommendedStack;
  const infra = architecture.infrastructure;

  return `You are a Principal Engineer generating a complete, autonomous-agent-ready technical build specification. This document is the sole source of truth for an AI coding tool (Claude Code, Cursor, Windsurf) building this system from scratch. Every section must be dense, precise, and unambiguous. No marketing language. No vague statements. Engineering signal only.

---

## SYSTEM INPUT

**Project:** ${projectName}
**Description:** ${projectDescription}

**Classification Contract:**
- Product Type: ${classification.productType} | ${classification.complexityLabel}
- Domain: ${classification.functionalDomain}
- Execution Style: ${classification.executionStyle}
- Target Users: ${classification.targetUsers}
- AI Layer: ${classification.requiresAiLayer} | Multi-Tenancy: ${classification.requiresMultiTenancy} | Marketplace: ${classification.requiresMarketplace}
- Core System: ${classification.coreSystemSummary}
- Rationale: ${classification.classificationRationale}

**Resolved Architecture:**
- Frontend: ${stack.frontend}
- Backend: ${stack.backend}
- Database: ${stack.database}
- Auth: ${stack.auth}
- Hosting: ${stack.hosting}
${stack.additional.length ? `- Additional: ${stack.additional.join(", ")}` : ""}
- Infra: ${infra.hosting} / CDN: ${infra.cdn} / Storage: ${infra.storage} / Jobs: ${infra.backgroundJobs}${infra.aiGateway ? ` / AI Gateway: ${infra.aiGateway}` : ""}
- Auth Strategy: ${architecture.authStrategy}
- DB Design Pattern: ${architecture.databaseDesign}
- APIs: ${architecture.recommendedApis.join(", ")}
- Integrations: ${architecture.recommendedIntegrations.join(", ")}
- Complexity: ${architecture.complexityScore}/10 — ${architecture.complexityRationale}
- Build Estimate: ~${architecture.estimatedBuildWeeks} weeks to MVP
- Key Risks: ${architecture.keyRisks.join(" | ")}
${architecture.aiLayerDesign ? `- AI Layer Design: ${architecture.aiLayerDesign}` : ""}
${architecture.multiTenancyDesign ? `- Multi-Tenancy Design: ${architecture.multiTenancyDesign}` : ""}
${architecture.marketplaceDesign ? `- Marketplace Design: ${architecture.marketplaceDesign}` : ""}

**Phase Template:** ${classification.phaseTemplate.join(" → ")}

**Discovery Intake (${responses.length} responses):**
${formatResponses(responses)}

---

## OUTPUT REQUIREMENTS

Generate the technical specification below. Adhere to the following rules without exception:

1. Return ONLY the Markdown document — no preamble, no postscript, no explanation outside the document.
2. Every code block must use the correct language tag (sql, typescript, bash, json, etc.).
3. SQL schemas must be complete and runnable — all tables, all columns with exact types, all indexes, all foreign keys.
4. API contracts must list every endpoint — METHOD, path, auth requirement, exact request body shape, exact response shape, all error codes.
5. The file tree must reflect the actual technology choices, not a generic template.
6. Bootstrap commands must be copy-pasteable in sequence with zero modification.
7. The CLAUDE.md section must be complete enough to paste directly into the repo root.
8. Sprint tasks must be discrete — each task is one focused Claude Code prompt's worth of work.
9. Do not omit any section. Do not merge sections. Use the exact headers below.

---

Generate the document now using these exact sections in this exact order:

# ${projectName} — Technical Build Specification
*Version: 1.0.0 | Classification: ${classification.complexityLabel} | Domain: ${classification.functionalDomain}*

## 1. SYSTEM CLASSIFICATION

Emit the classification contract verbatim in a structured block, then write 2–3 precise paragraphs on what this system IS architecturally — its core data model, primary workflows, and the key technical decisions that follow from the classification. Name specific tables, services, and patterns. No generic descriptions.

## 2. RECOMMENDED STACK

For each technology in the stack, emit a two-column table: | Technology | Rationale |. Include every layer: framework, language, database, ORM, auth, hosting, CDN, storage, queues, monitoring, testing. Be specific about versions where they matter.

## 3. ARCHITECTURE DECISIONS

For each major architectural decision (minimum 6, maximum 12), use this format:

### [Decision Title]
**Choice:** [what was chosen]
**Alternatives considered:** [what was rejected]
**Why:** [precise technical rationale — no hand-waving]
**Implication:** [what this means for the implementation]

Cover: hosting model, database choice, auth approach, state management, async job strategy, data access patterns, and any AI/multi-tenancy/marketplace specifics if flagged.

## 4. DATABASE SCHEMA

Emit complete, runnable SQL for every table. Include:
- All columns with exact types and constraints
- Primary keys, foreign keys, unique constraints
- All indexes (with rationale in a comment)
- Enum values as CHECK constraints or comments
- No placeholder columns — if a table needs it, include it

Follow each table definition with a one-line comment block explaining the table's role and any non-obvious design decisions.

## 5. API CONTRACT

Group endpoints by resource. For each endpoint:

\`\`\`
METHOD /path/to/endpoint
Auth: [none | bearer | session]
Request: { field: type, ... }
Response 200: { field: type, ... }
Response 4xx/5xx: { error: string, code: string }
\`\`\`

Include every endpoint needed for the MVP. Do not omit CRUD endpoints because they seem obvious.

## 6. PROJECT FILE TREE

Emit the complete directory structure as a code block. Annotate every directory and every non-obvious file with an inline comment. The tree must reflect the actual chosen stack — not a generic scaffold.

## 7. BOOTSTRAP SEQUENCE

Every command required to go from an empty directory to a running local development environment. Numbered steps. Each step has: a one-line description, then the exact shell command(s). No placeholders — use real package names, real flags, real config values where they can be inferred.

\`\`\`bash
# Step N — [description]
[exact command]
\`\`\`

## 8. ENVIRONMENT VARIABLES

Table of every environment variable: | Variable | Type | Description | Example |. Group by service. Mark required vs. optional.

## 9. SPRINT BUILD PLAN

Break the build into sprints of 1–2 weeks each, following the phase template: ${classification.phaseTemplate.join(", ")}.

For each sprint:

### Sprint N — [Sprint Name]
**Goal:** [one sentence — what is shippable at the end]
**Deliverables:**
- [Feature/component with acceptance criteria]

**Tasks (for Claude Code):**
- TASK N.1: [verb phrase] — Files: [list] — Validate: [how to confirm it works]
- TASK N.2: ...

Each task must be one focused engineering action. No tasks that span more than one file group or system boundary.

## 10. CLAUDE.md

Generate the complete content of a \`CLAUDE.md\` file to be placed at the repo root. This is the AI coding agent's standing instructions for this specific codebase. Include:

- Project overview (2–3 sentences)
- Technology stack summary
- Directory structure with descriptions
- Code style rules (naming, file organization, import order)
- Critical patterns to follow (with examples)
- Anti-patterns to avoid (with what to do instead)
- Testing requirements
- Environment setup
- Common commands
- Architecture principles the agent must not violate

## 11. SCALING NOTES

For each of these thresholds, write what breaks and what to refactor:
- 100 users / 1,000 requests/day
- 10,000 users / 100,000 requests/day
- 100,000 users / 1M requests/day

Include specific migration paths: what services to introduce, what to shard, what to extract into separate workers or services.

${classification.requiresAiLayer ? `
## 12. AI SYSTEM DESIGN

Detail the AI layer architecture specifically:
- Provider abstraction pattern
- Prompt versioning strategy
- Input/output validation
- Streaming architecture (if applicable)
- Retry and fallback logic
- Cost control patterns
- Evaluation approach
` : ""}`;
}

// ── BRAND PLAN PROMPT (Optional Addon) ───────────────────────
//
// Generated only when the admin requests it.
// Kept separate so the core tech spec is never bloated with
// brand/marketing content.

export function buildBrandPlanPrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationInput,
  responses: DiscoveryResponse[]
): string {
  const businessName =
    getResponseValue(responses, "business_name") || projectName;
  const brandPersonality = getResponseValue(responses, "brand_personality");
  const colorPreference = getResponseValue(responses, "color_preference");
  const visualStyle = getResponseValue(responses, "visual_style");
  const uniqueValue = getResponseValue(responses, "unique_value");
  const competitors = getResponseValue(responses, "competitors");

  return `You are a brand strategist producing a brand identity plan for a software product. This document will be handed directly to a designer and used to generate UI tokens, copywriting, and marketing assets.

## Input

**Product:** ${businessName}
**Description:** ${projectDescription}
**Type:** ${classification.productType} | Domain: ${classification.functionalDomain}
**Target Users:** ${classification.targetUsers}
**Unique Value:** ${uniqueValue || "Not specified"}
**Competitors:** ${competitors || "Not specified"}
**Brand Personality Preference:** ${brandPersonality || "Infer from product context"}
**Color Preference:** ${colorPreference || "Recommend based on domain"}
**Visual Style Preference:** ${visualStyle || "Recommend based on audience"}

**Discovery Intake:**
${formatResponses(responses)}

---

Return ONLY the Markdown document. No preamble. Start with the # heading.

# ${businessName} — Brand Identity Plan

## 1. POSITIONING STATEMENT
One sentence. Subject + differentiator + target + alternative.

## 2. BRAND PERSONALITY & VOICE
5 adjectives. For each: the trait, what it means in copy, a Do example, a Don't example.

## 3. TARGET PERSONAS
2–3 personas. For each: name, role, goal, pain point, how they find tools, what they trust.

## 4. COLOR PALETTE
For each color: name, hex, rgb, oklch, role (primary / secondary / accent / neutral / semantic), usage rule.
Include: primary, secondary, accent, background, surface, text, muted, success, warning, error.

## 5. TYPOGRAPHY
Primary typeface (with Google Fonts / open-source fallback). Secondary typeface. Type scale: H1–H6, body-lg, body, body-sm, caption, label, code. Font pairing rationale.

## 6. LOGO BRIEF
Symbol concept (2–3 ideas). Mark type recommendation. Style direction. Reference brands (3). What to avoid.

## 7. VISUAL SYSTEM
UI style direction. Icon set recommendation. Illustration style (or photography). Motion/animation principles. Component aesthetic (rounded vs. angular, dense vs. airy).

## 8. COPY EXAMPLES
For each: landing page headline, onboarding welcome message, empty state copy, error message, pricing page headline, email subject line (3 options), social bio.

## 9. BRAND ASSETS CHECKLIST
| Asset | Format | Priority | Notes |
All assets needed for launch, ordered by priority.`;
}

// ── GO-TO-MARKET PLAN PROMPT (Optional Addon) ─────────────────
//
// Generated only when the admin requests it.

export function buildMarketingPlanPrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationInput,
  responses: DiscoveryResponse[]
): string {
  const businessName =
    getResponseValue(responses, "business_name") || projectName;
  const businessModel = getResponseValue(responses, "business_model");
  const uniqueValue = getResponseValue(responses, "unique_value");
  const competitors = getResponseValue(responses, "competitors");
  const targetGeography = getResponseValue(responses, "target_geography");
  const marketingChannels = getResponseValue(responses, "marketing_channels");
  const launchTimeline = getResponseValue(responses, "launch_timeline");
  const targetScale = getResponseValue(responses, "target_scale");

  return `You are a growth strategist producing an actionable go-to-market plan. Every tactic must be specific, executable without a marketing team, and grounded in the product's actual positioning. No generic advice.

## Input

**Product:** ${businessName}
**Description:** ${projectDescription}
**Type:** ${classification.productType} | Domain: ${classification.functionalDomain}
**Target Users:** ${classification.targetUsers}
**Business Model:** ${businessModel || "Not specified"}
**Unique Value:** ${uniqueValue || "Not specified"}
**Competitors:** ${competitors || "Not specified"}
**Geography:** ${targetGeography || "Not specified"}
**Preferred Channels:** ${marketingChannels || "Not specified"}
**Launch Timeline:** ${launchTimeline || "Not specified"}
**Target Scale:** ${targetScale || "Not specified"}

**Discovery Intake:**
${formatResponses(responses)}

---

Return ONLY the Markdown document. No preamble. Start with the # heading.

# ${businessName} — Go-to-Market Plan

## 1. GTM SUMMARY
One-page overview: beachhead market, core offer, distribution wedge, why now.

## 2. TARGET MARKET
TAM / SAM / SOM estimates with assumptions shown. Beachhead segment definition. Buyer vs. user distinction. Jobs-to-be-done (3–5 jobs).

## 3. COMPETITIVE LANDSCAPE
| Competitor | Their strength | Their weakness | Why a user switches to us |
3–5 competitors. Positioning map (describe axes and where each player sits).

## 4. MESSAGING HIERARCHY
Core value proposition (1 sentence). Supporting claims (3). Proof points per claim. 5 headline variants for A/B testing.

## 5. PRICING STRATEGY
Recommended model with rationale. Tier breakdown (if applicable) with included features. Price points with anchoring logic. Competitor price comparison table.

## 6. PRE-LAUNCH (0–4 weeks before)
Specific actions: waitlist setup, beta recruitment, community seeding. Each action: what to do, where, expected outcome.

## 7. LAUNCH WEEK PLAYBOOK
Day-by-day plan. Platforms (Product Hunt, HN, Reddit, specific subreddits, X/LinkedIn). Draft post copy for each. Email sequence (subject lines + send timing).

## 8. CHANNEL STRATEGY
For each relevant channel:
**Channel:** [name]
**Why it fits:** [product/audience match]
**Approach:** [specific tactic, not generic]
**90-day output target:** [measurable]
**Time/budget:** [realistic]

## 9. 90-DAY ROADMAP
Week-by-week. What to ship, what to test, what to measure.

## 10. NORTH STAR + KPIS
North Star Metric (one). Leading indicators (3–5). Target numbers at 30 / 60 / 90 days post-launch.`;
}
