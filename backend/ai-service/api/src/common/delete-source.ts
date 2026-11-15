import { randomUUID } from "node:crypto";
import { transaction } from "../infrastructure/database/database";

/** The worker can only see cleanup after the deletion commits. */
export async function deleteSource(scopeId: string, sourceId?: string) {
  await transaction(async (client) => {
    await client.query(
      "SELECT id FROM notebook_ai.notebooks WHERE id=$1 FOR UPDATE",
      [scopeId],
    );
    const copies = await client.query<{
      snapshot_id: string;
      owner_id: string;
    }>(
      `SELECT s.snapshot_id,n.owner_id FROM notebook_ai.sources s JOIN notebook_ai.notebooks n ON n.id=s.notebook_id
       WHERE s.notebook_id=$1 AND ($2::uuid IS NULL OR s.id=$2) AND s.snapshot_id IS NOT NULL`,
      [scopeId, sourceId ?? null],
    );
    await client.query(
      "INSERT INTO notebook_ai.cleanup_outbox(id,scope_id,source_id,snapshot_cleanup) VALUES($1,$2,$3,$4::jsonb)",
      [
        randomUUID(),
        scopeId,
        sourceId ?? null,
        JSON.stringify(
          copies.rows.map((copy) => ({
            snapshotId: copy.snapshot_id,
            actorId: copy.owner_id,
          })),
        ),
      ],
    );
    await client.query(
      sourceId
        ? "DELETE FROM notebook_ai.sources WHERE id=$1 AND notebook_id=$2"
        : "DELETE FROM notebook_ai.notebooks WHERE id=$1",
      sourceId ? [sourceId, scopeId] : [scopeId],
    );
  });
}
