import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./infrastructure/database/database";

const MIGRATION_LOCK = 8087099;
const directory = join(__dirname, "../migrations");

/** Applies each migrations/NNN_*.sql once, in order, recording it in schema_migrations. */
export async function migrate() {
  const files = readdirSync(directory)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  const client = await db.connect();
  let failed: Error | undefined;
  try {
    // Data migrations can outlast the pool-wide statement timeout.
    await client.query("SET statement_timeout = 0");
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK]);
    await client.query("CREATE SCHEMA IF NOT EXISTS notebook_ai");
    await client.query(
      `CREATE TABLE IF NOT EXISTS notebook_ai.schema_migrations(
         name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const { rows } = await client.query<{ name: string }>(
      "SELECT name FROM notebook_ai.schema_migrations",
    );
    const applied = new Set(rows.map((row) => row.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      try {
        await client.query(readFileSync(join(directory, file), "utf8"));
        await client.query(
          "INSERT INTO notebook_ai.schema_migrations(name) VALUES($1)",
          [file],
        );
      } catch (error) {
        console.error(`Migration ${file} failed`);
        throw error;
      }
      console.log(`Applied migration ${file}`);
    }
  } catch (error) {
    // The session may be inside an aborted transaction; do not return it to the pool.
    failed = error as Error;
    throw error;
  } finally {
    client.release(failed);
  }
}

if (require.main === module)
  void migrate()
    .then(() => console.log("Notebook schema ready (legacy tables untouched)"))
    .catch(() => {
      console.error("Migration failed; check database and credentials");
      process.exitCode = 1;
    })
    .finally(() => db.end());
