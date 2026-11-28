import { Pool, PoolClient, QueryResultRow } from "pg";
import { config } from "../../config/env.config";
export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 12,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});
db.on("error", () =>
  console.error("Notebook PostgreSQL connection unavailable"),
);
export async function rows<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  args: unknown[] = [],
) {
  return (await db.query<T>(sql, args)).rows;
}
export async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  // A connection whose ROLLBACK fails is in an unknown state: discard it instead of pooling it.
  let broken: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      broken = rollbackError as Error;
    }
    throw error;
  } finally {
    client.release(broken);
  }
}
