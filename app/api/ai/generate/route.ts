import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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

export async function GET(request: Request) {
  // Allow polling: returns existing spec if done
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
    const db = getDB(env as { DB: D1Database });

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
    const db = getDB(env as { DB: D1Database });

    // Resolve user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Load project
    const [project] = await db
      .select({ id: projects.id, name: projects.name, description: projects.description, ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.ownerId !== user.id) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Return existing spec if already generated
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

    // Load classification (required)
    const [classification] = await db
      .select()
      .from(projectClassifications)
      .where(eq(projectClassifications.projectId, projectId))
      .limit(1);

    if (!classification) {
      return Response.json(
        { error: "No classification found — complete the classification step first." },
        { status: 400 }
      );
    }

    // Load architecture (required)
    const [archRec] = await db
      .select()
      .from(architectureRecommendations)
      .where(eq(architectureRecommendations.projectId, projectId))
      .limit(1);

    if (!archRec) {
      return Response.json(
        { error: "No architecture recommendation found — complete the inference step first." },
        { status: 400 }
      );
    }

    // Load discovery responses
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

    // Set up Anthropic
    const apiKey =
      (env as Record<string, string>).ANTHROPIC_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    // Create a generatedSpecifications record (or reuse failed one)
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

    // Build shared inputs
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

    // ── 1. Generate Tech Spec ─────────────────────────────────
    const techSpecPrompt = buildTechSpecPrompt(
      project.name,
      project.description ?? "",
      classInput,
      archInput,
      responses
    );

    const techSpecMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      tools: [
        {
          name: "generate_tech_spec",
          description: "Generate a complete implementation-ready technical specification as a Markdown document.",
          input_schema: {
            type: "object" as const,
            properties: {
              fullMarkdown: {
                type: "string",
                description: "Complete technical specification as formatted Markdown",
              },
            },
            required: ["fullMarkdown"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "generate_tech_spec" },
      messages: [{ role: "user", content: techSpecPrompt }],
    });

    const techSpecBlock = techSpecMessage.content.find((b) => b.type === "tool_use");
    if (!techSpecBlock || techSpecBlock.type !== "tool_use") {
      await db.update(generatedSpecifications)
        .set({ status: "failed", errorMessage: "Tech spec generation returned no tool result", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json({ error: "Tech spec generation failed" }, { status: 502 });
    }

    const techSpecValidated = TechSpecResultSchema.safeParse(techSpecBlock.input);
    if (!techSpecValidated.success) {
      await db.update(generatedSpecifications)
        .set({ status: "failed", errorMessage: "Tech spec schema mismatch", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json({ error: "Tech spec schema mismatch" }, { status: 502 });
    }

    const techSpec = techSpecValidated.data.fullMarkdown;

    // ── 2. Generate Brand Plan ────────────────────────────────
    const brandPlanPrompt = buildBrandPlanPrompt(
      project.name,
      project.description ?? "",
      classInput,
      responses
    );

    const brandPlanMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      tools: [
        {
          name: "generate_brand_plan",
          description: "Generate a complete brand identity plan as a Markdown document.",
          input_schema: {
            type: "object" as const,
            properties: {
              fullMarkdown: {
                type: "string",
                description: "Complete brand plan as formatted Markdown",
              },
            },
            required: ["fullMarkdown"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "generate_brand_plan" },
      messages: [{ role: "user", content: brandPlanPrompt }],
    });

    const brandPlanBlock = brandPlanMessage.content.find((b) => b.type === "tool_use");
    if (!brandPlanBlock || brandPlanBlock.type !== "tool_use") {
      await db.update(generatedSpecifications)
        .set({ status: "failed", errorMessage: "Brand plan generation returned no tool result", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json({ error: "Brand plan generation failed" }, { status: 502 });
    }

    const brandPlanValidated = BrandPlanResultSchema.safeParse(brandPlanBlock.input);
    if (!brandPlanValidated.success) {
      await db.update(generatedSpecifications)
        .set({ status: "failed", errorMessage: "Brand plan schema mismatch", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json({ error: "Brand plan schema mismatch" }, { status: 502 });
    }

    const brandPlan = brandPlanValidated.data.fullMarkdown;

    // ── 3. Generate Marketing Plan ────────────────────────────
    const marketingPlanPrompt = buildMarketingPlanPrompt(
      project.name,
      project.description ?? "",
      classInput,
      responses
    );

    const marketingPlanMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      tools: [
        {
          name: "generate_marketing_plan",
          description: "Generate a complete go-to-market and marketing plan as a Markdown document.",
          input_schema: {
            type: "object" as const,
            properties: {
              fullMarkdown: {
                type: "string",
                description: "Complete marketing plan as formatted Markdown",
              },
            },
            required: ["fullMarkdown"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "generate_marketing_plan" },
      messages: [{ role: "user", content: marketingPlanPrompt }],
    });

    const marketingPlanBlock = marketingPlanMessage.content.find((b) => b.type === "tool_use");
    if (!marketingPlanBlock || marketingPlanBlock.type !== "tool_use") {
      await db.update(generatedSpecifications)
        .set({ status: "failed", errorMessage: "Marketing plan generation returned no tool result", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json({ error: "Marketing plan generation failed" }, { status: 502 });
    }

    const marketingPlanValidated = MarketingPlanResultSchema.safeParse(marketingPlanBlock.input);
    if (!marketingPlanValidated.success) {
      await db.update(generatedSpecifications)
        .set({ status: "failed", errorMessage: "Marketing plan schema mismatch", updatedAt: new Date() })
        .where(eq(generatedSpecifications.id, specId));
      return Response.json({ error: "Marketing plan schema mismatch" }, { status: 502 });
    }

    const marketingPlan = marketingPlanValidated.data.fullMarkdown;

    // ── Save everything ───────────────────────────────────────
    const versionId = crypto.randomUUID();
    const fullSpecJson = JSON.stringify({ techSpec, brandPlan, marketingPlan });

    await db.insert(specificationVersions).values({
      id: versionId,
      specificationId: specId,
      projectId,
      versionNumber: "1.0.0",
      fullSpecMarkdown: techSpec,
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

    // Update project status to complete
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
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("POST /api/ai/generate error:", message, stack);
    return Response.json({ error: "Internal error", detail: message, stack }, { status: 500 });
  }
}
