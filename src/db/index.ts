import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The Neon driver sends every query with fetch(), and Next.js 14 caches fetch() results
// by default — which would serve stale data (e.g. an old image key after a bill's photo
// was replaced). Database queries must always hit the database.
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { cache: "no-store" },
});
export const db = drizzle(sql, { schema });
