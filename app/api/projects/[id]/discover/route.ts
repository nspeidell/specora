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
  responseMetadata: z.record(z.unknown()).optional(),
  stepNumber: z.number().int().min(1).max(TOTAL_STEPS),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
    .limit(1);

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const [session] = await db
    .select()
    .from(discoverySessions)
    .where(
      and(
        eq(discoverySessions.projectId, id),
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
        eq(discoverySessions.projectId, id),
        eq(discoverySessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  await db.insert(discoveryResponses).values({
    sessionId: session.id,
    projectId: id,
    questionKey,
    questionText,
    responseText: responseText ?? "",
    responseMetadata: responseMetadata ? JSON.stringify(responseMetadata) : null,
    stepNumber,
  });

  const nextStep = Math.max(session.currentStep ?? 0, stepNumber);
  await db
    .update(discoverySessions)
    .set({ currentStep: nextStep })
    .where(eq(discoverySessions.id, session.id));

  if (stepNumber === TOTAL_STEPS) {
    await db
      .update(discoverySessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(discoverySessions.id, session.id));

    await db
      .update(projects)
      .set({ status: "classified", updatedAt: new Date() })
      .where(eq(projects.id, id));

    return Response.json({ done: true, nextStep: null });
  }

  const nextQuestion = getQuestion(stepNumber + 1);
  return Response.json({ done: false, nextStep: stepNumber + 1, nextQuestion });
}
