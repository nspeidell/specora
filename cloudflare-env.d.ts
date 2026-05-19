// Ambient type declarations for Cloudflare bindings used in API routes.
// We import only what we need from @cloudflare/workers-types to avoid
// conflicts with the DOM lib types (fetch, Request, Response, etc.).

import type { D1Database as _D1Database } from "@cloudflare/workers-types";

declare global {
  type D1Database = _D1Database;
}
