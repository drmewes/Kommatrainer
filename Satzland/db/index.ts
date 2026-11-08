import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

// A fresh local checkout has no migrated preview database; hosted deployments apply drizzle/0000 at publish.
let localTable: Promise<unknown> | undefined;
export function ensureLocalTable() {
  if (!import.meta.env.DEV) return;
  const db = getDb();
  return localTable ||= db.run(sql`CREATE TABLE IF NOT EXISTS schreibi_records (owner text NOT NULL, id text NOT NULL, kind text NOT NULL, payload text NOT NULL, updated_at integer NOT NULL, PRIMARY KEY(owner, id))`)
    .then(() => db.run(sql`CREATE INDEX IF NOT EXISTS schreibi_owner_kind ON schreibi_records (owner, kind)`))
    .then(() => db.run(sql`CREATE INDEX IF NOT EXISTS schreibi_owner_updated ON schreibi_records (owner, updated_at)`))
    .catch(error => { localTable = undefined; throw error; });
}
