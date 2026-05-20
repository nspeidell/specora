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
} from "@/lib/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildInferencePrompt,
  InferenceResultSchema,
  INFERENCE_PROMPT_VERSION,
} from "@/lib/ai/prompts/inference";
import { z } from "zod";

const requestSchema = z.object({
  projectId: z.string().uuid(),
});

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
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        ownerId: projects.ownerId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.ownerId !== user.id) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Return existing inference if already done
    const [existing] = await db
      .select()
      .from(architectureRecommendations)
      .where(eq(architectureRecommendations.projectId, projectId))
      .limit(1);

    if (existing) {
      return Response.json({ recommendation: existing });
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

    // Load discovery responses
    const [session] = await db
      .select({ id: discoverySessions.id })
      .from(discoverySessions)
      .where(eq(discoverySessions.projectId, projectId))
      .limit(1);

    const responses = session
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

    // Call Claude
    const apiKey =
      (env as Record<string, string>).ANTHROPIC_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = buildInferencePrompt(
      project.name,
      project.description ?? "",
      {
        productType: classification.productType,
        complexityLevel: classification.complexityLevel,
        complexityLabel: classification.complexityLabel,
        functionalDomain: classification.functionalDomain,
        executionStyle: classification.executionStyle,
        targetUsers: classification.targetUsers,
        coreSystemSummary: classification.coreSystemSummary,
        requiresAiLayer: classification.requiresAiLayer ?? false,
        requiresMultiTenancy: classification.requiresMultiTenancy ?? false,
        requiresMarketplace: classification.requiresMarketplace ?? false,
      },
      responses
    );

    // Use tool use for guaranteed structured output — no JSON parsing errors
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [
        {
          name: "infer_architecture",
          description: "Infer the optimal technical architecture for a software product based on its classification and discovery responses.",
          input_schema: {
            type: "object" as const,
            properties: {
              recommendedStack: {
                type: "object",
                properties: {
                  frontend: { type: "string" },
                  backend: { type: "string" },
                  database: { type: "string" },
                  auth: { type: "string" },
                  hosting: { type: "string" },
                  additional: { type: "array", items: { type: "string" } },
                },
                required: ["frontend","backend","database","auth","hosting","additional"],
              },
              authStrategy: { type: "string" },
              databaseDesign: { type: "string" },
              infrastructure: {
                type: "object",
                properties: {
                  hosting: { type: "string" },
                  cdn: { type: "string" },
                  storage: { type: "string" },
                  backgroundJobs: { type: "string" },
                  aiGateway: { type: "string" },
                },
                required: ["hosting","cdn","storage","backgroundJobs"],
              },
              recommendedApis: { type: "array", items: { type: "string" } },
              recommendedIntegrations: { type: "array", items: { type: "string" } },
              scalingConsiderations: { type: "string" },
              complexityScore: { type: "integer", minimum: 1, maximum: 10 },
              complexityRationale: { type: "string" },
              estimatedBuildWeeks: { type: "integer", minimum: 1 },
              keyRisks: { type: "array", items: { type: "string" } },
              aiLayerDesign: { type: "string" },
              multiTenancyDesign: { type: "string" },
              marketplaceDesign: { type: "string" },
            },
            required: ["recommendedStack","authStrategy","databaseDesign","infrastructure","recommendedApis","recommendedIntegrations","scalingConsiderations","complexityScore","complexityRationale","estimatedBuildWeeks","keyRisks"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "infer_architecture" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return Response.json({ error: "AI did not return a tool result" }, { status: 502 });
    }

    const validated = InferenceResultSchema.safeParse(toolBlock.input);
    if (!validated.success) {
      console.error("Inference schema mismatch:", validated.error.issues);
      return Response.json(
        { error: "AI response did not match expected schema", issues: validated.error.issues },
        { status: 502 }
      );
    }

    const result = validated.data;

    // Save to DB
    const recId = crypto.randomUUID();
    await db.insert(architectureRecommendations).values({
      id: recId,
      projectId,
      recommendedStack: JSON.stringify(result.recommendedStack),
      authStrategy: result.authStrategy,
      databaseDesign: result.databaseDesign,
      infrastructure: JSON.stringify(result.infrastructure),
      recommendedApis: JSON.stringify(result.recommendedApis),
      recommendedIntegrations: JSON.stringify(result.recommendedIntegrations),
      scalingConsiderations: result.scalingConsiderations,
      complexityScore: result.complexityScore,
      complexityRationale: result.complexityRationale,
      estimatedBuildWeeks: result.estimatedBuildWeeks,
      keyRisks: JSON.stringify(result.keyRisks),
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-6",
      promptVersion: INFERENCE_PROMPT_VERSION,
    });

    // Update project status
    await db
      .update(projects)
      .set({ status: "inferring" })
      .where(eq(projects.id, projectId));

    const [saved] = await db
      .select()
      .from(architectureRecommendations)
      .where(eq(architectureRecommendations.id, recId))
      .limit(1);

    return Response.json({ recommendation: saved }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("POST /api/ai/infer error:", message, stack);
    return Response.json(
      { error: "Internal error", detail: message, stack },
      { status: 500 }
    );
  }
}
