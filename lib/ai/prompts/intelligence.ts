// ============================================================
// INTELLIGENCE PASS PROMPT — v1.0.0
// Post-discovery analysis. Runs after client submits interview.
//
// Behaves like a senior CTO reviewing a client brief before
// the architecture work begins. Surfaces:
//   - Contradictions in stated requirements
//   - Inferred requirements not explicitly stated
//   - Feasibility and timeline concerns
//   - MVP scope vs future scope separation
//   - Key technical risks
//   - Clarifications worth asking before generating the spec
// ============================================================

import { z } from "zod";

export const INTELLIGENCE_PROMPT_VERSION = "1.0.0";

// ── Input Types ───────────────────────────────────────────────

export type IntelligenceInput = {
  projectName: string;
  responses: Array<{
    questionKey: string;
    questionText: string;
    responseText: string;
  }>;
};

// ── Output Schema ─────────────────────────────────────────────

const ContradictionSchema = z.object({
  fields: z.array(z.string()).describe("Question keys involved"),
  description: z.string().describe("Plain language explanation of the contradiction"),
  severity: z.enum(["high", "medium", "low"]),
  recommendation: z.string().describe("How to resolve this contradiction"),
});

const InferredRequirementSchema = z.object({
  requirement: z.string().describe("The inferred requirement in one sentence"),
  inferredFrom: z.string().describe("Which answer(s) triggered this inference"),
  confidence: z.number().min(0).max(1).describe("Confidence 0–1"),
  architectureImpact: z.string().describe("What this means for the technical architecture"),
});

const FeasibilityFlagSchema = z.object({
  concern: z.string().describe("Short title for this concern"),
  description: z.string().describe("Detailed explanation"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  recommendation: z.string().describe("Concrete action to address this"),
});

const ScopeItemSchema = z.object({
  feature: z.string(),
  rationale: z.string().describe("Why this is in/out of MVP"),
});

export const IntelligenceResultSchema = z.object({
  contradictions: z.array(ContradictionSchema)
    .describe("Requirements that conflict with each other"),

  inferredRequirements: z.array(InferredRequirementSchema)
    .describe("Technical requirements implied by the responses but not explicitly stated"),

  feasibilityFlags: z.array(FeasibilityFlagSchema)
    .describe("Timeline, budget, scope, or technical feasibility concerns"),

  mvpScope: z.array(ScopeItemSchema)
    .describe("Features that should be in version 1 — achievable within the stated timeline"),

  futureScope: z.array(ScopeItemSchema)
    .describe("Features to defer to version 2 or later"),

  keyRisks: z.array(z.string())
    .describe("Top technical, operational, or business risks in this build"),

  recommendedClarifications: z.array(z.string())
    .describe("Questions worth asking the client before generating the spec"),

  overallComplexityAssessment: z.string()
    .describe("1–2 sentences on the true complexity of this system"),

  architectureSignals: z.array(z.string())
    .describe("Specific architectural decisions that are clearly implied by the requirements"),

  scopeRiskScore: z.number().min(1).max(10)
    .describe("How high the risk of scope creep is — 1=low risk, 10=runaway scope"),
});

export type IntelligenceResult = z.infer<typeof IntelligenceResultSchema>;

// ── Prompt Builder ────────────────────────────────────────────

export function buildIntelligencePrompt(input: IntelligenceInput): string {
  const formatted = input.responses
    .map((r) => `[${r.questionKey}] ${r.questionText}\n→ ${r.responseText}`)
    .join("\n\n");

  return `You are a Principal Engineer and solutions architect conducting a pre-architecture review of a client's product brief. Your job is to analyze the discovery responses below with the critical eye of a senior CTO — not to validate the client's assumptions, but to surface what they missed, what contradicts itself, and what will cause problems later.

Be direct and specific. Do not be encouraging or diplomatic about real problems. This analysis is for the technical team, not the client.

## Project: ${input.projectName}

## Discovery Responses
${formatted}

---

Analyze these responses and return a structured intelligence report. Specifically:

1. **Contradictions** — Find requirements that directly conflict with each other. Common examples: timeline vs scope mismatch, budget vs infrastructure expectations, single-user claim vs multi-tenant workflows, no-auth claim vs role-based features. Only flag real contradictions, not stylistic preferences.

2. **Inferred Requirements** — Identify technical requirements that the client did NOT explicitly state but that are clearly implied by their answers. Examples: if they describe "client workspaces" they need multi-tenant data isolation. If they describe "automated invoicing" they need a job queue. If they describe "approval workflows" they need a state machine. Be specific about the architectural implication.

3. **Feasibility Flags** — Identify real risks: timeline vs stated feature set, budget vs infrastructure needs, team sophistication vs architectural complexity, compliance requirements they may not have accounted for. Critical = blocks the project as described. High = requires immediate scope reduction. Medium = worth flagging. Low = monitor.

4. **MVP Scope** — Based on the timeline, budget, and team answers, define what should realistically be in version 1. Be ruthless. Include only what is essential to validate the core value proposition.

5. **Future Scope** — Everything else. Be specific about which stated requirements belong in V2+.

6. **Architecture Signals** — List the specific architectural decisions that are clearly implied by the requirements (even if the client didn't state them). Examples: "requires Stripe Connect (not just Billing) because of marketplace payouts", "requires multi-tenant row isolation because of the org/client model", "requires background job queue because of automated workflows".

7. **Scope Risk Score** — Rate 1–10 how likely scope creep is given the stated requirements. 8+ means the project as described is not buildable within the constraints.

Only flag issues that genuinely exist in the data. If a response area is clean, return an empty array for that section. Do not invent problems.`;
}
