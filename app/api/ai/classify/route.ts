import { D1Database } from "@cloudflare/workers-types";
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
} from "@/lib/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildClassificationPrompt,
  ClassificationResultSchema,
  CLASSIFICATION_PROMPT_VERSION,
} from "@/lib/ai/prompts/classification";
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
      .select({ id: projects.id, name: projects.name, description: projects.description, ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.ownerId !== user.id) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Return existing classification if already done
    const [existing] = await db
      .select()
      .from(projectClassifications)
      .where(eq(projectClassifications.projectId, projectId))
      .limit(1);

    if (existing) {
      return Response.json({ classification: existing });
    }

    // Load discovery responses
    const [session] = await db
      .select({ id: discoverySessions.id })
      .from(discoverySessions)
      .where(eq(discoverySessions.projectId, projectId))
      .limit(1);

    if (!session) {
      return Response.json({ error: "No discovery session found" }, { status: 404 });
    }

    const responses = await db
      .select({
        questionKey: discoveryResponses.questionKey,
        questionText: discoveryResponses.questionText,
        responseText: discoveryResponses.responseText,
        stepNumber: discoveryResponses.stepNumber,
      })
      .from(discoveryResponses)
      .where(eq(discoveryResponses.sessionId, session.id))
      .orderBy(discoveryResponses.stepNumber);

    if (responses.length === 0) {
      return Response.json({ error: "No discovery responses found" }, { status: 400 });
    }

    // Call Claude
    const apiKey = (env as Record<string, string>).ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = buildClassificationPrompt(
      project.name,
      project.description ?? "",
      responses
    );

    // Use tool use for guaranteed structured output — no JSON parsing errors
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [
        {
          name: "classify_project",
          description: "Classify a software project across product type, complexity, domain, and execution style.",
          input_schema: {
            type: "object" as const,
            properties: {
              productType: { type: "string", enum: ["marketing_website","saas_application","crm_internal_tool","ai_tool_agent","marketplace","mobile_app","automation_workflow","seo_content_engine","data_platform","hybrid_system"] },
              productTypeLabel: { type: "string" },
              complexityLevel: { type: "integer", minimum: 1, maximum: 5 },
              complexityLabel: { type: "string" },
              functionalDomain: { type: "string", enum: ["sales_crm","operations","marketing_seo","finance_billing","ai_automation","content_generation","workflow_management","analytics_dashboards","customer_onboarding","developer_tooling","healthcare","education","ecommerce","social_community","other"] },
              functionalDomainLabel: { type: "string" },
              executionStyle: { type: "string", enum: ["real_time_interactive","async_background","batch_scheduled","event_driven","hybrid"] },
              executionStyleLabel: { type: "string" },
              targetUsers: { type: "string" },
              coreSystemSummary: { type: "string" },
              requiresAiLayer: { type: "boolean" },
              requiresMultiTenancy: { type: "boolean" },
              requiresMarketplace: { type: "boolean" },
              confidenceScore: { type: "integer", minimum: 0, maximum: 100 },
              classificationRationale: { type: "string" },
              phaseTemplate: { type: "array", items: { type: "string" } },
            },
            required: ["productType","productTypeLabel","complexityLevel","complexityLabel","functionalDomain","functionalDomainLabel","executionStyle","executionStyleLabel","targetUsers","coreSystemSummary","requiresAiLayer","requiresMultiTenancy","requiresMarketplace","confidenceScore","classificationRationale","phaseTemplate"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "classify_project" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return Response.json({ error: "AI did not return a tool result" }, { status: 502 });
    }

    const validated = ClassificationResultSchema.safeParse(toolBlock.input);
    if (!validated.success) {
      console.error("Classification schema mismatch:", validated.error.issues);
      return Response.json(
        { error: "AI response did not match expected schema", issues: validated.error.issues },
        { status: 502 }
      );
    }

    const result = validated.data;

    // Save to DB
    const classificationId = crypto.randomUUID();
    await db.insert(projectClassifications).values({
      id: classificationId,
      projectId,
      productType: result.productType,
      complexityLevel: result.complexityLevel,
      complexityLabel: result.complexityLabel,
      functionalDomain: result.functionalDomain,
      executionStyle: result.executionStyle,
      targetUsers: result.targetUsers,
      coreSystemSummary: result.coreSystemSummary,
      classificationRationale: result.classificationRationale,
      confidenceScore: result.confidenceScore,
      requiresAiLayer: result.requiresAiLayer,
      requiresMultiTenancy: result.requiresMultiTenancy,
      requiresMarketplace: result.requiresMarketplace,
      phaseTemplate: JSON.stringify(result.phaseTemplate),
      aiProvider: "anthropic",
      promptVersion: CLASSIFICATION_PROMPT_VERSION,
    });

    // Update project status
    await db
      .update(projects)
      .set({ status: "classified" })
      .where(eq(projects.id, projectId));

    const [saved] = await db
      .select()
      .from(projectClassifications)
      .where(eq(projectClassifications.id, classificationId))
      .limit(1);

    return Response.json({ classification: saved }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("POST /api/ai/classify error:", message, stack);
    return Response.json({ error: "Internal error", detail: message }, { status: 500 });
  }
}
