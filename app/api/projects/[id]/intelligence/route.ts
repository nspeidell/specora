// POST /api/projects/[id]/intelligence
// Runs the post-discovery intelligence pass for a project.
// Must be called after discovery is complete (status = 'discovery').
// Uses Claude tool use to produce structured IntelligenceResult.

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
} from "@/lib/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildIntelligencePrompt,
  IntelligenceResultSchema,
  INTELLIGENCE_PROMPT_VERSION,
  type IntelligenceResult,
} from "@/lib/ai/prompts/intelligence";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // ── Auth ───────────────────────────────────────────────────
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  // ── Resolve user ───────────────────────────────────────────
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // ── Load project ───────────────────────────────────────────
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.ownerId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Load discovery responses ───────────────────────────────
  const session = await db.query.discoverySessions.findFirst({
    where: eq(discoverySessions.projectId, projectId),
  });
  if (!session) {
    return Response.json(
      { error: "No discovery session found for this project" },
      { status: 400 }
    );
  }

  const rawResponses = await db.query.discoveryResponses.findMany({
    where: eq(discoveryResponses.sessionId, session.id),
  });
  if (rawResponses.length === 0) {
    return Response.json(
      { error: "No discovery responses found" },
      { status: 400 }
    );
  }

  const responses = rawResponses.map((r) => ({
    questionKey: r.questionKey,
    questionText: r.questionText,
    responseText: r.responseText ?? "",
  }));

  // ── Mark as analyzing ──────────────────────────────────────
  await db
    .update(projects)
    .set({ intelligenceStatus: "analyzing", status: "analyzing" })
    .where(eq(projects.id, projectId));

  // ── Call Claude ────────────────────────────────────────────
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const gatewayUrl = process.env.CLOUDFLARE_AI_GATEWAY_URL;

    const client = new Anthropic({
      apiKey,
      ...(gatewayUrl ? { baseURL: `${gatewayUrl}/anthropic` } : {}),
    });

    const toolName = "submit_intelligence_report";
    const prompt = buildIntelligencePrompt({
      projectName: project.name,
      responses,
    });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      tool_choice: { type: "tool" as const, name: toolName },
      tools: [
        {
          name: toolName,
          description:
            "Submit the structured intelligence report for this discovery session.",
          input_schema: {
            type: "object" as const,
            properties: {
              contradictions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fields: { type: "array", items: { type: "string" } },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                    recommendation: { type: "string" },
                  },
                  required: ["fields", "description", "severity", "recommendation"],
                },
              },
              inferredRequirements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    requirement: { type: "string" },
                    inferredFrom: { type: "string" },
                    confidence: { type: "number" },
                    architectureImpact: { type: "string" },
                  },
                  required: ["requirement", "inferredFrom", "confidence", "architectureImpact"],
                },
              },
              feasibilityFlags: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    concern: { type: "string" },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    recommendation: { type: "string" },
                  },
                  required: ["concern", "description", "severity", "recommendation"],
                },
              },
              mvpScope: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    feature: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["feature", "rationale"],
                },
              },
              futureScope: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    feature: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["feature", "rationale"],
                },
              },
              keyRisks: { type: "array", items: { type: "string" } },
              recommendedClarifications: {
                type: "array",
                items: { type: "string" },
              },
              overallComplexityAssessment: { type: "string" },
              architectureSignals: {
                type: "array",
                items: { type: "string" },
              },
              scopeRiskScore: { type: "number" },
            },
            required: [
              "contradictions",
              "inferredRequirements",
              "feasibilityFlags",
              "mvpScope",
              "futureScope",
              "keyRisks",
              "recommendedClarifications",
              "overallComplexityAssessment",
              "architectureSignals",
              "scopeRiskScore",
            ],
          },
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });

    // ── Extract tool result ──────────────────────────────────
    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude did not return a tool_use block");
    }

    const parsed = IntelligenceResultSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new Error(`Invalid intelligence result: ${parsed.error.message}`);
    }

    const result: IntelligenceResult = parsed.data;

    // ── Persist ──────────────────────────────────────────────
    await db
      .update(projects)
      .set({
        intelligenceStatus: "complete",
        intelligenceResult: JSON.stringify(result),
        status: "analyzed",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return Response.json({ ok: true, result });
  } catch (err) {
    // Mark failed but don't leave in "analyzing" state
    await db
      .update(projects)
      .set({
        intelligenceStatus: "failed",
        status: "discovery", // roll back so admin can retry
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.error("[intelligence] Error:", err);
    return Response.json(
      { error: "Intelligence analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
