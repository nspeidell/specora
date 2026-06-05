import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import {
  users,
  projects,
  discoverySessions,
  discoveryResponses,
  projectClassifications,
  architectureRecommendations,
  generatedSpecifications,
  specificationVersions,
} from "@/lib/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildTechSpecPrompt,
  buildBrandPlanPrompt,
  buildMarketingPlanPrompt,
  TechSpecResultSchema,
  BrandPlanResultSchema,
  MarketingPlanResultSchema,
  SPEC_GENERATION_PROMPT_VERSION,
  type ClassificationInput,
  type ArchitectureInput,
} from "@/lib/ai/prompts/spec-generation";
import {
  buildOperationalArchPrompt,
  OperationalArchResultSchema,
} from "@/lib/ai/prompts/operational-architecture";
import {
  buildScopeAnalysisPrompt,
  ScopeAnalysisResultSchema,
} from "@/lib/ai/prompts/scope-analysis";
import { z } from "zod";

const requestSchema = z.object({
  projectId: z.string().uuid(),
});

function parseJsonField<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// ── Single-tool Claude call helper ──────────────────────────────
async function callClaude(
  client: Anthropic,
  toolName: string,
  toolDescription: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: {
          type: "object" as const,
          properties: {
            fullMarkdown: {
              type: "string",
              description: "Complete document as formatted Markdown",
            },
          },
          required: ["fullMarkdown"],
        },
      },
    ],
    tool_choice: { type: "tool" as const, name: toolName },
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error(`${toolName}: no tool_use block in response`);
  }

  const parsed = (block.input as { fullMarkdown?: unknown }).fullMarkdown;
  if (typeof parsed !== "string" || !parsed) {
    throw new Error(`${toolName}: fullMarkdown missing or not a string`);
  }

  return parsed;
}

// ── GET — polling ───────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return Response.json({ error: "projectId required" }, { status: 422 });
    }

    const { env } = await getCloudflareContext();
    const db = getDB(env as unknown as { DB: D1Database });

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const [spec] = await db
      .select()
      .from(generatedSpecifications)
      .where(eq(generatedSpecifications.projectId, projectId))
      .limit(1);

    if (!spec) return Response.json({ spec: null });

    const [version] = await db
      .select()
      .from(specificationVersions)
      .where(eq(specificationVersions.specificationId, spec.id))
      .limit(1);

    return Response.json({ spec, version: version ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Internal error", detail: message }, { status: 500 });
  }
}

// ── POST — generate ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "projectId required" }, { status: 422 });
    }

    const { projectId } = parsed.data;
    const { env } = await getCloudflareContext();
    const db = getDB(env as unknown as { DB: D1Database });

    // ── Resolve user ─────────────────────────────────────────
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // ── Load project ─────────────────────────────────────────
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.ownerId !== user.id) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // ── Return existing complete spec ─────────────────────────
    const [existing] = await db
      .select()
      .from(generatedSpecifications)
      .where(eq(generatedSpecifications.projectId, projectId))
      .limit(1);

    if (existing && existing.status === "complete") {
      const [existingVersion] = await db
        .select()
        .from(specificationVersions)
        .where(eq(specificationVersions.specificationId, existing.id))
        .limit(1);
      return Response.json({ spec: existing, version: existingVersion ?? null });
    }

    // ── Load classification (required) ────────────────────────
    const [classification] = await db
      .select()
      .from(projectClassifications)
      .where(eq(projectClassifications.projectId, projectId))
      .limit(1);

    if (!classification) {
      return Response.json(
        { error: "No classification found — complete classification first." },
        { status: 400 }
      );
    }

    // ── Load architecture (required) ──────────────────────────
    const [archRec] = await db
      .select()
      .from(architectureRecommendations)
      .where(eq(architectureRecommendations.projectId, projectId))
      .limit(1);

    if (!archRec) {
      return Response.json(
        { error: "No architecture found — complete the inference step first." },
        { status: 400 }
      );
    }

    // ── Load discovery responses ──────────────────────────────
    const [session] = await db
      .select({ id: discoverySessions.id })
      .from(discoverySessions)
      .where(eq(discoverySessions.projectId, projectId))
      .limit(1);

    const rawResponses = session
      ? await db
          .select({
            questionKey: discoveryResponses.questionKey,
            questionText: discoveryResponses.questionText,
            responseText: discoveryResponses.responseText,
            stepNumber: discoveryResponses.stepNumber,
          })
          .from(discoveryResponses)
          .where(eq(discoveryResponses.sessionId, session.id))
          .orderBy(discoveryResponses.stepNumber)
      : [];

    const responses = rawResponses.map((r) => ({
      questionKey: r.questionKey,
      questionText: r.questionText,
      responseText: r.responseText ?? "",
      stepNumber: r.stepNumber ?? 0,
    }));

    // ── Set up Anthropic ──────────────────────────────────────
    const apiKey =
      (env as Record<string, string>).ANTHROPIC_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }
    const gatewayUrl =
      (env as Record<string, string>).CLOUDFLARE_AI_GATEWAY_URL ??
      process.env.CLOUDFLARE_AI_GATEWAY_URL;

    const anthropic = new Anthropic({
      apiKey,
      ...(gatewayUrl ? { baseURL: `${gatewayUrl}/anthropic` } : {}),
    });

    // ── Create or reuse spec record ───────────────────────────
    let specId: string;
    if (existing) {
      specId = existing.id;
      await db
        .update(generatedSpecifications)
        .set({ status: "generating", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
    } else {
      specId = crypto.randomUUID();
      await db.insert(generatedSpecifications).values({
        id: specId,
        projectId,
        userId: user.id,
        status: "generating",
        targetAiProvider: "claude",
      });
    }

    // ── Build shared inputs ───────────────────────────────────
    const classInput: ClassificationInput = {
      productType: classification.productType,
      complexityLevel: classification.complexityLevel,
      complexityLabel: classification.complexityLabel,
      functionalDomain: classification.functionalDomain,
      executionStyle: classification.executionStyle,
      targetUsers: classification.targetUsers ?? "",
      coreSystemSummary: classification.coreSystemSummary ?? "",
      requiresAiLayer: classification.requiresAiLayer ?? false,
      requiresMultiTenancy: classification.requiresMultiTenancy ?? false,
      requiresMarketplace: classification.requiresMarketplace ?? false,
      classificationRationale: classification.classificationRationale ?? "",
      phaseTemplate: parseJsonField<string[]>(classification.phaseTemplate, []),
    };

    const archInput: ArchitectureInput = {
      recommendedStack: parseJsonField(archRec.recommendedStack, {
        frontend: "", backend: "", database: "", auth: "", hosting: "", additional: [],
      }),
      authStrategy: archRec.authStrategy ?? "",
      databaseDesign: archRec.databaseDesign ?? "",
      infrastructure: parseJsonField(archRec.infrastructure, {
        hosting: "", cdn: "", storage: "", backgroundJobs: "",
      }),
      recommendedApis: parseJsonField<string[]>(archRec.recommendedApis, []),
      recommendedIntegrations: parseJsonField<string[]>(archRec.recommendedIntegrations, []),
      scalingConsiderations: archRec.scalingConsiderations ?? "",
      complexityScore: archRec.complexityScore ?? 5,
      complexityRationale: archRec.complexityRationale ?? "",
      estimatedBuildWeeks: archRec.estimatedBuildWeeks ?? 12,
      keyRisks: parseJsonField<string[]>(archRec.keyRisks, []),
    };

    const intelligenceResult = project.intelligenceResult ?? null;

    // ── Run all 4 Claude calls in PARALLEL ────────────────────
    // Parallel execution cuts total time from ~60s to ~15-20s.
    const [techSpec, operationalArchitecture, scopeAnalysis, brandPlan] =
      await Promise.all([
        // 1. Technical implementation spec
        callClaude(
          anthropic,
          "generate_tech_spec",
          "Generate a complete implementation-ready technical specification.",
          buildTechSpecPrompt(
            project.name,
            project.description ?? "",
            classInput,
            archInput,
            responses
          ),
          6000
        ),

        // 2. Operational architecture (roles, workflows, automation)
        callClaude(
          anthropic,
          "generate_operational_arch",
          "Generate the operational architecture document covering roles, workflows, and automation.",
          buildOperationalArchPrompt({
            projectName: project.name,
            productType: classification.productType,
            complexityLabel: classification.complexityLabel,
            responses,
            intelligenceResult,
          }),
          5000
        ),

        // 3. Scope & phasing analysis (MVP vs future)
        callClaude(
          anthropic,
          "generate_scope_analysis",
          "Generate the scope and phasing analysis defining MVP and future iterations.",
          buildScopeAnalysisPrompt({
            projectName: project.name,
            complexityLabel: classification.complexityLabel,
            executionStyle: classification.executionStyle,
            estimatedBuildWeeks: archRec.estimatedBuildWeeks ?? 12,
            responses,
            intelligenceResult,
          }),
          4000
        ),

        // 4. Brand plan (optional — only if brand direction was given)
        responses.some((r) =>
          ["brand_direction", "visual_style", "brand_personality"].includes(
            r.questionKey
          ) && r.responseText
        )
          ? callClaude(
              anthropic,
              "generate_brand_plan",
              "Generate a brand identity plan.",
              buildBrandPlanPrompt(
                project.name,
                project.description ?? "",
                classInput,
                responses
              ),
              4000
            )
          : Promise.resolve(""),
      ]);

    // ── Validate outputs ──────────────────────────────────────
    const techSpecV = TechSpecResultSchema.safeParse({ fullMarkdown: techSpec });
    const operationalV = OperationalArchResultSchema.safeParse({
      fullMarkdown: operationalArchitecture,
    });
    const scopeV = ScopeAnalysisResultSchema.safeParse({
      fullMarkdown: scopeAnalysis,
    });
    const brandV = BrandPlanResultSchema.safeParse({ fullMarkdown: brandPlan || "" });

    if (!techSpecV.success || !operationalV.success || !scopeV.success) {
      const failedDoc = !techSpecV.success
        ? "tech spec"
        : !operationalV.success
        ? "operational architecture"
        : "scope analysis";
      await db
        .update(generatedSpecifications)
        .set({
          status: "failed",
          errorMessage: `${failedDoc} schema validation failed`,
          updatedAt: new Date(),
        })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json(
        { error: `Generation failed: ${failedDoc} schema mismatch` },
        { status: 502 }
      );
    }

    // ── Save ──────────────────────────────────────────────────
    const versionId = crypto.randomUUID();
    const fullSpecJson = JSON.stringify({
      techSpec: techSpecV.data.fullMarkdown,
      operationalArchitecture: operationalV.data.fullMarkdown,
      scopeAnalysis: scopeV.data.fullMarkdown,
      brandPlan: brandV.success && brandPlan ? brandV.data.fullMarkdown : "",
      gtmPlan: "", // future: on-demand generation
    });

    await db.insert(specificationVersions).values({
      id: versionId,
      specificationId: specId,
      projectId,
      versionNumber: "1.0.0",
      fullSpecMarkdown: techSpecV.data.fullMarkdown,
      fullSpecJson,
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-6",
      promptVersion: SPEC_GENERATION_PROMPT_VERSION,
    });

    await db
      .update(generatedSpecifications)
      .set({
        status: "complete",
        currentVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(eq(generatedSpecifications.id, specId));

    await db
      .update(projects)
      .set({ status: "complete" })
      .where(eq(projects.id, projectId));

    const [savedSpec] = await db
      .select()
      .from(generatedSpecifications)
      .where(eq(generatedSpecifications.id, specId))
      .limit(1);

    const [savedVersion] = await db
      .select()
      .from(specificationVersions)
      .where(eq(specificationVersions.id, versionId))
      .limit(1);

    return Response.json({ spec: savedSpec, version: savedVersion }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/ai/generate error:", message);
    return Response.json({ error: "Internal error", detail: message }, { status: 500 });
  }
}
