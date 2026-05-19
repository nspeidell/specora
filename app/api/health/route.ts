import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const hasDB = typeof (env as Record<string, unknown>).DB !== "undefined";

    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
      bindings: { DB: hasDB },
    });
  } catch (err) {
    return Response.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
