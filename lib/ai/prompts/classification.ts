import { z } from "zod";

export const CLASSIFICATION_PROMPT_VERSION = "1.0.0";

// ─── Zod schema for Claude's structured JSON response ───────────────────────

export const ClassificationResultSchema = z.object({
  productType: z.enum([
    "marketing_website",
    "saas_application",
    "crm_internal_tool",
    "ai_tool_agent",
    "marketplace",
    "mobile_app",
    "automation_workflow",
    "seo_content_engine",
    "data_platform",
    "hybrid_system",
  ]),
  productTypeLabel: z.string(),
  complexityLevel: z.number().int().min(1).max(5),
  complexityLabel: z.string(),
  functionalDomain: z.enum([
    "sales_crm",
    "operations",
    "marketing_seo",
    "finance_billing",
    "ai_automation",
    "content_generation",
    "workflow_management",
    "analytics_dashboards",
    "customer_onboarding",
    "developer_tooling",
    "healthcare",
    "education",
    "ecommerce",
    "social_community",
    "other",
  ]),
  functionalDomainLabel: z.string(),
  executionStyle: z.enum([
    "real_time_interactive",
    "async_background",
    "batch_scheduled",
    "event_driven",
    "hybrid",
  ]),
  executionStyleLabel: z.string(),
  targetUsers: z.string(),
  coreSystemSummary: z.string(),
  requiresAiLayer: z.boolean(),
  requiresMultiTenancy: z.boolean(),
  requiresMarketplace: z.boolean(),
  confidenceScore: z.number().int().min(0).max(100),
  classificationRationale: z.string(),
  phaseTemplate: z.array(z.string()),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// ─── Prompt builder ──────────────────────────────────────────────────────────

export function buildClassificationPrompt(
  projectName: string,
  projectDescription: string,
  discoveryResponses: Array<{ questionKey: string; questionText: string; responseText: string | null }>
): string {
  const responsesText = discoveryResponses
    .map((r) => `Q: ${r.questionText}\nA: ${r.responseText ?? "(skipped)"}`)
    .join("\n\n");

  return `You are an expert software architect classifying a software product for a specification generator.

Analyze the following project information and discovery responses. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

PROJECT NAME: ${projectName}
PROJECT DESCRIPTION: ${projectDescription}

DISCOVERY RESPONSES:
${responsesText}

Return this exact JSON structure:
{
  "productType": one of: "marketing_website" | "saas_application" | "crm_internal_tool" | "ai_tool_agent" | "marketplace" | "mobile_app" | "automation_workflow" | "seo_content_engine" | "data_platform" | "hybrid_system",
  "productTypeLabel": human-readable label, e.g. "SaaS Application",
  "complexityLevel": integer 1-5 where:
    1 = Static / simple tools (no backend, no auth)
    2 = CRUD apps (basic auth, simple DB)
    3 = SaaS multi-tenant systems (orgs, billing, permissions)
    4 = AI-native systems (async AI, prompt architecture, streaming)
    5 = Autonomous / agentic systems (agents, orchestration, memory),
  "complexityLabel": human-readable label, e.g. "Level 3 — Multi-tenant SaaS",
  "functionalDomain": one of: "sales_crm" | "operations" | "marketing_seo" | "finance_billing" | "ai_automation" | "content_generation" | "workflow_management" | "analytics_dashboards" | "customer_onboarding" | "developer_tooling" | "healthcare" | "education" | "ecommerce" | "social_community" | "other",
  "functionalDomainLabel": human-readable label, e.g. "Workflow Management",
  "executionStyle": one of: "real_time_interactive" | "async_background" | "batch_scheduled" | "event_driven" | "hybrid",
  "executionStyleLabel": human-readable label, e.g. "Real-time interactive",
  "targetUsers": 1-2 sentence description of who uses this product,
  "coreSystemSummary": 2-3 sentence plain-English summary of what this system does and how it works technically,
  "requiresAiLayer": boolean — true if the product's core value requires AI generation, classification, or decision-making,
  "requiresMultiTenancy": boolean — true if the product needs organizations, teams, or distinct tenant isolation,
  "requiresMarketplace": boolean — true if the product connects two or more distinct user types transacting with each other,
  "confidenceScore": integer 0-100 representing confidence in this classification,
  "classificationRationale": 2-3 sentences explaining why you classified it this way,
  "phaseTemplate": array of phase strings that this project needs, chosen from: ["foundation", "auth", "database", "design", "dashboard", "discovery", "ai_layer", "inference", "spec_generation", "versioning", "multi_tenancy", "marketplace", "billing", "analytics", "launchpad", "testing", "deployment"]
}`;
}
