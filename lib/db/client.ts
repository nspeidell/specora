import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Database = ReturnType<typeof getDB>;

export function getDB(env: { DB: D1Database }) {
  return drizzle(env.DB, { schema });
}
