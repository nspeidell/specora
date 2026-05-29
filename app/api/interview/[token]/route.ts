// Public API — no Clerk auth required.
// GET  /api/interview/[token] — returns link state + any existing answers
// POST /api/interview/[token] — saves one response; creates project+session on first call

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { getDB } from "@/lib/db/client";
import {
  discoveryLinks,
  projects,
  discoverySessions,
  discoveryResponses,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ── GET ───────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  const link = await db.query.discoveryLinks.findFirst({
    where: eq(discoveryLinks.token, token),
  });

  if (!link) {
    return Response.json({ error: "Discovery link not found." }, { status: 404 });
  }

  if (link.status === "expired") {
    return Response.json({ error: "This discovery link has expired." }, { status: 410 });
  }

  // Load existing answers if a session already exists
  let existingAnswers: Record<string, string> = {};
  if (link.sessionId) {
    const responses = await db.query.discoveryResponses.findMany({
      where: eq(discoveryResponses.sessionId, link.sessionId),
    });
    for (const r of responses) {
      existingAnswers[r.questionKey] = r.responseText ?? "";
    }
  }

  return Response.json({
    projectName: link.projectName,
    clientName: link.clientName ?? undefined,
    status: link.status,
    existingAnswers,
  });
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  // Parse body
  let body: {
    questionKey: string;
    questionText: string;
    responseText: string;
    stepNumber: number;
    isLast?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { questionKey, questionText, responseText, stepNumber, isLast } = body;

  if (!questionKey || !questionText) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Load the link
  const link = await db.query.discoveryLinks.findFirst({
    where: eq(discoveryLinks.token, token),
  });

  if (!link) {
    return Response.json({ error: "Discovery link not found." }, { status: 404 });
  }

  if (link.status === "expired" || link.status === "completed") {
    return Response.json(
      { error: "This session is no longer active." },
      { status: 410 }
    );
  }

  // Resolve the admin user
  const adminUser = await db.query.users.findFirst({
    where: eq(users.id, link.createdByUserId),
  });

  if (!adminUser) {
    return Response.json({ error: "Owner account not found." }, { status: 500 });
  }

  let projectId: string;
  let sessionId: string;

  if (link.sessionId && link.projectId) {
    // Session already exists — use it
    projectId = link.projectId;
    sessionId = link.sessionId;
  } else {
    // First answer — lazily create the project and session
    const projectId_ = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId_,
      ownerId: adminUser.id,
      organizationId: link.organizationId ?? null,
      discoveryLinkId: link.id,
      name: link.projectName,
      clientName: link.clientName ?? null,
      clientEmail: link.clientEmail ?? null,
      status: "discovery",
    });

    const sessionId_ = crypto.randomUUID();
    await db.insert(discoverySessions).values({
      id: sessionId_,
      projectId: projectId_,
      userId: adminUser.id,
      discoveryLinkId: link.id,
      status: "in_progress",
      currentStep: stepNumber,
    });

    // Update the link with the new project + session IDs
    await db
      .update(discoveryLinks)
      .set({
        projectId: projectId_,
        sessionId: sessionId_,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(discoveryLinks.id, link.id));

    projectId = projectId_;
    sessionId = sessionId_;
  }

  // Upsert the response for this question
  // (handles re-answers when client goes back)
  const existing = await db.query.discoveryResponses.findFirst({
    where: and(
      eq(discoveryResponses.sessionId, sessionId),
      eq(discoveryResponses.questionKey, questionKey)
    ),
  });

  if (existing) {
    await db
      .update(discoveryResponses)
      .set({ responseText, stepNumber })
      .where(eq(discoveryResponses.id, existing.id));
  } else {
    await db.insert(discoveryResponses).values({
      sessionId,
      projectId,
      questionKey,
      questionText,
      responseText,
      stepNumber,
    });
  }

  // Update session progress
  await db
    .update(discoverySessions)
    .set({ currentStep: stepNumber })
    .where(eq(discoverySessions.id, sessionId));

  // On last question — mark complete
  if (isLast) {
    await db
      .update(discoverySessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(discoverySessions.id, sessionId));

    await db
      .update(discoveryLinks)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(discoveryLinks.id, link.id));

    await db
      .update(projects)
      .set({ status: "discovery", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  return Response.json({ ok: true });
}
