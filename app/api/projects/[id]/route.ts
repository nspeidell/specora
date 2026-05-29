import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db/client";
import {
  users,
  projects,
  discoverySessions,
  projectClassifications,
  architectureRecommendations,
  generatedSpecifications,
  specificationVersions,
} from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { env } = await getCloudflareContext();
    const db = getDB(env as { DB: D1Database });

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.ownerId !== user.id) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Load all related data in parallel
    const [sessionRows, classificationRows, archRows, specRows] =
      await Promise.all([
        db
          .select({ id: discoverySessions.id, status: discoverySessions.status, currentStep: discoverySessions.currentStep, totalSteps: discoverySessions.totalSteps, discoveryLinkId: discoverySessions.discoveryLinkId })
          .from(discoverySessions)
          .where(eq(discoverySessions.projectId, projectId))
          .limit(1),
        db
          .select()
          .from(projectClassifications)
          .where(eq(projectClassifications.projectId, projectId))
          .limit(1),
        db
          .select()
          .from(architectureRecommendations)
          .where(eq(architectureRecommendations.projectId, projectId))
          .limit(1),
        db
          .select()
          .from(generatedSpecifications)
          .where(eq(generatedSpecifications.projectId, projectId))
          .limit(1),
      ]);

    const session = sessionRows[0] ?? null;
    const classification = classificationRows[0] ?? null;
    const architecture = archRows[0] ?? null;
    const spec = specRows[0] ?? null;

    // Load spec version if spec exists and is complete
    let specVersion = null;
    if (spec?.currentVersionId) {
      const versionRows = await db
        .select()
        .from(specificationVersions)
        .where(eq(specificationVersions.id, spec.currentVersionId))
        .limit(1);
      specVersion = versionRows[0] ?? null;
    }

    return Response.json({
      project,
      session,
      classification,
      architecture,
      spec,
      specVersion,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/projects/[id] error:", message);
    return Response.json({ error: "Internal error", detail: message }, { status: 500 });
  }
}
