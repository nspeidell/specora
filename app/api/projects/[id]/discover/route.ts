import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import {
  users,
  projects,
  discoverySessions,
  discoveryResponses,
} from "@/lib/db/schema";
import { getQuestion, TOTAL_STEPS } from "@/lib/discovery/questions";
import { z } from "zod";

export const runtime = "edge";

const saveResponseSchema = z.object({
  questionKey: z.string(),
  questionText: z.string(),
  responseText: z.string().optional(),
  responseMetadata: z.record(z.unknown()).optional(), // for multiselect arrays etc.
  stepNumber: z.number().int().min(1).max(TOTAL_STEPS),
});

// GET — fetch current session state + existing responses
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { env } = await getCloudflareContext();
  const db = getDB(env as { DB: D1Database });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, user.id)))
    .limit(1);

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const [session] = await db
    .select()
    .from(discoverySessions)
    .where(
      and(
        eq(discoverySessions.projectId, params.id),
        eq(discoverySessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  const responses = await db
    .select()
    .from(discoveryResponses)
    .where(eq(discoveryResponses.sessionId, session.id));

  return Response.json({ project, session, responses });
}

// POST — save a single response and advance the step
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = saveResponseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { questionKey, questionText, responseText, responseMetadata, stepNumber } = parsed.data;

  const { env } = await getCloudflareContext();
  const db = getDB(env as { DB: D1Database });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const [session] = await db
    .select()
    .from(discoverySessions)
    .where(
      and(
        eq(discoverySessions.projectId, params.id),
        eq(discoverySessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  // Upsert: delete existing response for this step if re-answering, then insert
  const existing = await db
    .select({ id: discoveryResponses.id })
    .from(discoveryResponses)
    .where(
      and(
        eq(discoveryResponses.sessionId, session.id),
        eq(discoveryResponses.questionKey, questionKey)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Re-answering: just insert a new one (we keep history)
  }

  await db.insert(discoveryResponses).values({
    sessionId: session.id,
    projectId: params.id,
    questionKey,
    questionText,
    responseText: responseText ?? "",
    responseMetadata: responseMetadata ? JSON.stringify(responseMetadata) : null,
    stepNumber,
  });

  // Advance current step on the session
  const nextStep = Math.max(session.currentStep ?? 0, stepNumber);
  await db
    .update(discoverySessions)
    .set({ currentStep: nextStep })
    .where(eq(discoverySessions.id, session.id));

  // If last step, mark session complete and project as classified
  if (stepNumber === TOTAL_STEPS) {
    await db
      .update(discoverySessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(discoverySessions.id, session.id));

    await db
      .update(projects)
      .set({ status: "classified", updatedAt: new Date() })
      .where(eq(projects.id, params.id));

    return Response.json({ done: true, nextStep: null });
  }

  const nextQuestion = getQuestion(stepNumber + 1);
  return Response.json({
    done: false,
    nextStep: stepNumber + 1,
    nextQuestion,
  });
}
