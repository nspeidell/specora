// POST /api/interview/links — admin creates a discovery link (requires auth)
// GET  /api/interview/links — admin lists their discovery links

import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1Database } from "@cloudflare/workers-types";
import { getDB } from "@/lib/db/client";
import { discoveryLinks, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function resolveUser(db: ReturnType<typeof getDB>, clerkUserId: string) {
  return db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
}

// ── GET — list links ──────────────────────────────────────────

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  const user = await resolveUser(db, clerkUserId);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const links = await db.query.discoveryLinks.findMany({
    where: eq(discoveryLinks.createdByUserId, user.id),
    orderBy: [desc(discoveryLinks.createdAt)],
  });

  return Response.json({ links });
}

// ── POST — create link ────────────────────────────────────────

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const db = getDB(env as unknown as { DB: D1Database });

  const user = await resolveUser(db, clerkUserId);
  if (!user) {
    // Auto-provision user row if webhook missed
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    await db.insert(users).values({
      clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      fullName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        null,
      avatarUrl: clerkUser.imageUrl || null,
    });
  }

  const resolvedUser = user || (await resolveUser(db, clerkUserId));
  if (!resolvedUser) {
    return Response.json({ error: "Failed to resolve user" }, { status: 500 });
  }

  let body: {
    projectName: string;
    clientName?: string;
    clientEmail?: string;
    organizationId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.projectName?.trim()) {
    return Response.json(
      { error: "projectName is required" },
      { status: 400 }
    );
  }

  // Generate a secure token — 32 random bytes as hex
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const newLink = {
    id: crypto.randomUUID(),
    token,
    createdByUserId: resolvedUser.id,
    organizationId: body.organizationId ?? null,
    projectName: body.projectName.trim(),
    clientName: body.clientName?.trim() ?? null,
    clientEmail: body.clientEmail?.trim() ?? null,
    status: "pending" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(discoveryLinks).values(newLink);

  return Response.json({
    id: newLink.id,
    token,
    url: `/interview/${token}`,
  });
}
