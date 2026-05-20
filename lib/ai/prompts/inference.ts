import { z } from "zod";

export const INFERENCE_PROMPT_VERSION = "1.0.0";

// ─── Zod schema ──────────────────────────────────────────────────────────────

export const InferenceResultSchema = z.object({
  recommendedStack: z.object({
    frontend: z.string(),
    backend: z.string(),
    database: z.string(),
    auth: z.string(),
    hosting: z.string(),
    additional: z.array(z.string()),
  }),
  authStrategy: z.string(),
  databaseDesign: z.string(),
  infrastructure: z.object({
    hosting: z.string(),
    cdn: z.string(),
    storage: z.string(),
    backgroundJobs: z.string(),
    aiGateway: z.string().optional(),
  }),
  recommendedApis: z.array(z.string()),
  recommendedIntegrations: z.array(z.string()),
  scalingConsiderations: z.string(),
  complexityScore: z.number().int().min(1).max(10),
  complexityRationale: z.string(),
  estimatedBuildWeeks: z.number().int().min(1),
  keyRisks: z.array(z.string()),
  aiLayerDesign: z.string().optional(),
  multiTenancyDesign: z.string().optional(),
  marketplaceDesign: z.string().optional(),
});

export type InferenceResult = z.infer<typeof InferenceResultSchema>;

// ─── Prompt builder ──────────────────────────────────────────────────────────

type ClassificationSummary = {
  productType: string;
  complexityLevel: number;
  complexityLabel: string;
  functionalDomain: string;
  executionStyle: string;
  targetUsers: string | null;
  coreSystemSummary: string | null;
  requiresAiLayer: boolean | number;
  requiresMultiTenancy: boolean | number;
  requiresMarketplace: boolean | number;
};

export function buildInferencePrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationSummary,
  discoveryResponses: Array<{ questionKey: string; questionText: string; responseText: string | null }>
): string {
  const responsesText = discoveryResponses
    .map((r) => `Q: ${r.questionText}\nA: ${r.responseText ?? "(skipped)"}`)
    .join("\n\n");

  const aiSection = classification.requiresAiLayer
    ? `\n- AI LAYER REQUIRED: Design the AI architecture. Include model selection, prompt strategy, streaming approach, and how AI integrates into the core user flow.`
    : "";

  const multiTenancySection = classification.requiresMultiTenancy
    ? `\n- MULTI-TENANCY REQUIRED: Design the tenant isolation model, organization/team structure, role-based access control, and data partitioning strategy.`
    : "";

  const marketplaceSection = classification.requiresMarketplace
    ? `\n- MARKETPLACE REQUIRED: Design the two-sided marketplace architecture including transaction flow, trust/escrow model, and how buyers and sellers interact.`
    : "";

  return `You are an expert software architect and CTO. A non-technical founder has described their product and it has been classified. Your job is to infer the optimal technical architecture for this specific product.

PROJECT: ${projectName}
DESCRIPTION: ${projectDescription}

CLASSIFICATION:
- Product Type: ${classification.productType}
- Complexity: ${classification.complexityLabel}
- Domain: ${classification.functionalDomain}
- Execution Style: ${classification.executionStyle}
- Target Users: ${classification.targetUsers ?? "Not specified"}
- Core System: ${classification.coreSystemSummary ?? "Not specified"}

DISCOVERY RESPONSES:
${responsesText}

ARCHITECTURE REQUIREMENTS:${aiSection}${multiTenancySection}${marketplaceSection}
- Base stack should match the complexity tier (Level ${classification.complexityLevel})
- Optimize for a solo founder or tiny team shipping fast
- Prefer managed services over self-hosted infrastructure

Return ONLY valid JSON — no markdown, no explanation outside the JSON:
{
  "recommendedStack": {
    "frontend": "specific framework + version recommendation",
    "backend": "specific backend approach (e.g. Next.js API routes, separate service)",
    "database": "specific DB recommendation with rationale",
    "auth": "auth solution recommendation",
    "hosting": "hosting recommendation",
    "additional": ["any additional tools/services that are essential"]
  },
  "authStrategy": "detailed description of auth approach — sessions, JWT, OAuth providers, permission model",
  "databaseDesign": "description of database structure — key entities, relationships, important design decisions",
  "infrastructure": {
    "hosting": "specific hosting recommendation",
    "cdn": "CDN recommendation",
    "storage": "file/object storage recommendation",
    "backgroundJobs": "how to handle async work",
    "aiGateway": "AI routing/gateway approach (only if AI layer required)"
  },
  "recommendedApis": ["list of third-party APIs this product needs"],
  "recommendedIntegrations": ["list of third-party services/integrations"],
  "scalingConsiderations": "specific scaling bottlenecks to watch and how to address them for this product",
  "complexityScore": integer 1-10 representing overall technical complexity,
  "complexityRationale": "2-3 sentences explaining the complexity score",
  "estimatedBuildWeeks": integer weeks for a solo developer to reach MVP,
  "keyRisks": ["3-5 specific technical or product risks for this system"]${classification.requiresAiLayer ? `,\n  "aiLayerDesign": "detailed description of AI architecture — models, prompts, streaming, cost management"` : ""}${classification.requiresMultiTenancy ? `,\n  "multiTenancyDesign": "detailed description of multi-tenant architecture"` : ""}${classification.requiresMarketplace ? `,\n  "marketplaceDesign": "detailed description of marketplace transaction and trust architecture"` : ""}
}`;
}
