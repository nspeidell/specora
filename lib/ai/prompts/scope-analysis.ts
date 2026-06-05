// ============================================================
// SCOPE & PHASING ANALYSIS PROMPT — v1.0.0
// Produces an opinionated, phased build plan that compresses
// scope to a shippable MVP and organizes everything else into
// future iterations.
//
// This document answers: "What do we build, in what order,
// and what do we explicitly NOT build right now?"
// ============================================================

import { z } from "zod";

export const SCOPE_ANALYSIS_PROMPT_VERSION = "1.0.0";

export type ScopeAnalysisInput = {
  projectName: string;
  complexityLabel: string;
  executionStyle: string;
  estimatedBuildWeeks: number;
  responses: Array<{
    questionKey: string;
    questionText: string;
    responseText: string;
  }>;
  intelligenceResult?: string | null;
};

export const ScopeAnalysisResultSchema = z.object({
  fullMarkdown: z
    .string()
    .describe(
      "Complete scope and phasing analysis document as dense Markdown. No preamble."
    ),
});

export function buildScopeAnalysisPrompt(input: ScopeAnalysisInput): string {
  const formatted = input.responses
    .map((r) => `[${r.questionKey}] ${r.questionText}\n→ ${r.responseText}`)
    .join("\n\n");

  const intelligenceSection = input.intelligenceResult
    ? `\n## Intelligence Analysis (pre-computed — use this for scope decisions)\n${input.intelligenceResult}\n`
    : "";

  return `You are a Principal Engineer performing scope compression analysis for a software build. Your job is to determine exactly what gets built in each phase, in what order, and what gets cut from MVP. You are not being diplomatic — you are being precise about what is and is not achievable.

## System: ${input.projectName}
## Classification: ${input.complexityLabel} | ${input.executionStyle}
## Estimated Build: ~${input.estimatedBuildWeeks} weeks total
${intelligenceSection}
## Discovery Responses
${formatted}

---

Return ONLY the Markdown document. No preamble. Start with the # heading.

# ${input.projectName} — Scope & Phasing Analysis

## SCOPE COMPRESSION STATEMENT

Write 2–3 sentences that state clearly: what this system is at its core, what the minimum testable version looks like, and the single biggest scope risk that could derail the build. Be blunt.

## PHASE 0 — FOUNDATION (Week 1–2)
*Everything that must exist before any feature can be built. Not user-facing.*

**Goal:** Running, deployed application with no features.

### Deliverables
- [ ] [specific deliverable with acceptance criteria]
- [ ] ...

### What "done" looks like
[Concrete definition — what can you do at the end of Phase 0 that you couldn't before]

## PHASE 1 — CORE MVP (Week 3–N)
*The minimum product that demonstrates the core value proposition. Something a real user can do the primary workflow in.*

**Goal:** [One sentence — what can a user accomplish at the end of Phase 1]
**Estimated duration:** [N weeks]

### In scope
For each feature: name, description, acceptance criteria, complexity (S/M/L/XL).

| Feature | Description | Acceptance Criteria | Size |
|---|---|---|---|

### Explicitly out of scope
Features that were requested or implied but do NOT belong in Phase 1:

| Feature | Why it's deferred | Planned for |
|---|---|---|

### Phase 1 architecture constraints
What technical decisions Phase 1 intentionally does NOT make (to avoid premature optimization).

## PHASE 2 — GROWTH (Post-launch)
*Features that add value once the core loop is validated.*

**Goal:** [What does a Phase 2 user get that a Phase 1 user doesn't]

### Feature set
| Feature | Prerequisite | Complexity | Value |
|---|---|---|---|

## PHASE 3 — SCALE (When you have traction)
*Features that only make sense with real usage data or at significant scale.*

| Feature | Trigger condition | Complexity |
|---|---|---|

## EXPLICITLY OUT OF SCOPE (All phases)
Features that should not be built in this product at all — either because they're outside the core value proposition, too risky, or better handled by third-party tools.

| Feature | Reason | Alternative |
|---|---|---|

## BUILD ORDER (Phase 1 sequence)

Week-by-week sequence for Phase 1. Each week is one focused area of work.

| Week | Focus area | Key deliverables | Blockers if skipped |
|---|---|---|---|

## RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|

## TECHNICAL DEBT TO ACCEPT

Shortcuts that are acceptable in Phase 1 because reworking them in Phase 2 is cheaper than building them right initially:

| Shortcut | Acceptable because | Refactor trigger |
|---|---|---|

## SUCCESS CRITERIA

**Phase 1 is done when:**
- [ ] [specific, measurable criterion]
- [ ] ...

**The product is working when a user can:**
1. [first job to be done, end to end]
2. [second job to be done]
3. ...`;
}
