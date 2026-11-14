import { randomUUID } from "node:crypto";
import { transaction } from "../infrastructure/database/database";

/** The worker can only see cleanup after the deletion commits. */
export async function deleteSource(scopeId: string, sourceId?: string) {
  await transaction(async (client) => {
    await client.query(
      "INSERT INTO notebook_ai.cleanup_outbox(id,scope_id,source_id) VALUES($1,$2,$3)",
      [randomUUID(), scopeId, sourceId ?? null],
    );
    await client.query(
      sourceId
        ? "DELETE FROM notebook_ai.sources WHERE id=$1 AND notebook_id=$2"
        : "DELETE FROM notebook_ai.notebooks WHERE id=$1",
      sourceId ? [sourceId, scopeId] : [scopeId],
    );
  });
}
