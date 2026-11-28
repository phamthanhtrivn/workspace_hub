import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { openCopyDatabases } from "./runtime.mjs";

const families = [
  { name: "channel", table: "messages", media: "medias" },
  { name: "direct", table: "direct_messages", media: "direct_medias" },
];

/** Keeps non-document replies: roots with surviving replies become empty recalled placeholders. */
export async function purgeChatCards(client, apply) {
  const report = {};
  await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
  try {
    if (apply)
      await client.query(
        "LOCK TABLE messages,direct_messages IN SHARE ROW EXCLUSIVE MODE",
      );
    for (const family of families) {
      const targets = (
        await client.query(
          `SELECT id,thread_parent_id FROM ${family.table} WHERE type='DOCUMENT' ORDER BY id`,
        )
      ).rows;
      const ids = targets.map((row) => row.id);
      const retained = ids.length
        ? (
            await client.query(`WITH RECURSIVE keep(id) AS (
        SELECT DISTINCT p.id FROM ${family.table} p JOIN ${family.table} c ON c.thread_parent_id=p.id WHERE p.type='DOCUMENT' AND c.type<>'DOCUMENT'
        UNION SELECT p.id FROM ${family.table} p JOIN ${family.table} c ON c.thread_parent_id=p.id JOIN keep k ON k.id=c.id WHERE p.type='DOCUMENT'
      ) SELECT id FROM keep`)
          ).rows.map((row) => row.id)
        : [];
      report[family.name] = {
        cards: ids.length,
        deleted: ids.length - retained.length,
        threadPlaceholders: retained.length,
      };
      if (!apply || !ids.length) continue;
      await client.query(
        `DELETE FROM ${family.media} WHERE message_id=ANY($1::uuid[])`,
        [ids],
      );
      if (retained.length)
        await client.query(
          `UPDATE ${family.table} SET type='TEXT',content=NULL,recalled=TRUE,pinned=FALSE WHERE id=ANY($1::uuid[])`,
          [retained],
        );
      await client.query(
        `DELETE FROM ${family.table} WHERE id=ANY($1::uuid[]) AND type='DOCUMENT'`,
        [ids],
      );
      const parents = [
        ...new Set(targets.map((row) => row.thread_parent_id).filter(Boolean)),
      ];
      if (parents.length)
        await client.query(
          `UPDATE ${family.table} p SET
        thread_reply_count=(SELECT COUNT(*)::int FROM ${family.table} c WHERE c.thread_parent_id=p.id AND c.deleted_at IS NULL),
        thread_last_reply_at=(SELECT MAX(created_at) FROM ${family.table} c WHERE c.thread_parent_id=p.id AND c.deleted_at IS NULL)
        WHERE p.id=ANY($1::uuid[])`,
          [parents],
        );
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    return report;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function purgeLinkedSources(client, apply) {
  await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
  try {
    if (apply)
      await client.query(
        "SELECT n.id FROM notebook_ai.notebooks n WHERE EXISTS (SELECT 1 FROM notebook_ai.sources s WHERE s.notebook_id=n.id AND s.snapshot_id IS NULL) ORDER BY n.id FOR UPDATE",
      );
    const sources = (
      await client.query(
        "SELECT id,notebook_id FROM notebook_ai.sources WHERE snapshot_id IS NULL ORDER BY id",
      )
    ).rows;
    if (apply && sources.length) {
      await client.query(
        `INSERT INTO notebook_ai.cleanup_outbox(id,scope_id,source_id,snapshot_cleanup)
        SELECT * FROM UNNEST($1::uuid[],$2::uuid[],$3::uuid[],$4::jsonb[])`,
        [
          sources.map(() => randomUUID()),
          sources.map((row) => row.notebook_id),
          sources.map((row) => row.id),
          sources.map(() => "[]"),
        ],
      );
      await client.query(
        "DELETE FROM notebook_ai.sources WHERE id=ANY($1::uuid[]) AND snapshot_id IS NULL",
        [sources.map((row) => row.id)],
      );
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    return {
      sources: sources.length,
      notebooksRetained: new Set(sources.map((row) => row.notebook_id)).size,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function purgeLegacyReferences(args = process.argv.slice(2)) {
  if (args.includes("--help"))
    return {
      usage:
        "node backend/scripts/file-copy-maintenance/purge-legacy-file-references.mjs [--dry-run | --apply]. Local databases only. Retains original Documents, normal messages, notebooks, notes, recordings and private copied sources.",
    };
  if (args.some((arg) => !["--dry-run", "--apply"].includes(arg)))
    throw new Error("Unknown cleanup option.");
  const apply = args.includes("--apply");
  const db = await openCopyDatabases();
  const report = {
    mode: apply ? "apply" : "dry-run",
    communication: null,
    notebook: null,
  };
  try {
    report.communication = await purgeChatCards(db.communication, apply);
    report.notebook = await purgeLinkedSources(db.ai, apply);
    return report;
  } catch {
    return {
      ...report,
      error:
        "Cleanup stopped. Each database operation is atomic; completed domains stay completed. Re-run dry run before retrying.",
    };
  } finally {
    await db.close();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  purgeLegacyReferences()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      if (report.error) process.exitCode = 1;
    })
    .catch(() => {
      console.error(
        "Cleanup failed. Check local env and apply the additive schema migrations first. No credentials were displayed.",
      );
      process.exitCode = 1;
    });
}
