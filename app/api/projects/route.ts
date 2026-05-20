import { auth, currentUser } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import { users, projects, discoverySessions } from "@/lib/db/schema";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
});

async function getOrProvisionUser(
  db: ReturnType<typeof getDB>,
  clerkUserId: string
) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing) return existing;

  // Row missing (webhook not yet configured) — provision on first API call
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  );
  if (!primaryEmail) return null;

  const fullName =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  await db.insert(users).values({
    clerkUserId,
    email: primaryEmail.emailAddress,
    fullName,
    avatarUrl: clerkUser.imageUrl ?? null,
  });

  const [created] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return created ?? null;
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

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { name, description } = parsed.data;

    const { env } = await getCloudflareContext();
    const db = getDB(env as { DB: D1Database });

    const user = await getOrProvisionUser(db, clerkUserId);
    if (!user) {
      return Response.json(
        { error: "Could not resolve user — try signing out and back in." },
        { status: 404 }
      );
    }

    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      ownerId: user.id,
      name,
      description,
      status: "discovery",
    });

    const sessionId = crypto.randomUUID();
    await db.insert(discoverySessions).values({
      id: sessionId,
      projectId,
      userId: user.id,
      status: "in_progress",
      currentStep: 0,
      totalSteps: 12,
    });

    return Response.json({ projectId, sessionId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("POST /api/projects error:", message, stack);
    return Response.json(
      { error: "Internal error", detail: message, stack },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = await getCloudflareContext();
    const db = getDB(env as { DB: D1Database });

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return Response.json({ projects: [] });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, user.id))
      .orderBy(projects.createdAt);

    return Response.json({ projects: userProjects });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Internal error", detail: message }, { status: 500 });
  }
}
