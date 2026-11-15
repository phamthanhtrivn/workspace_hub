import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { openCopyDatabases } from "./file-copy-maintenance/runtime.mjs";

export function isNotebookSnapshotKey(key, actorId) {
  return (
    typeof key === "string" &&
    (key.startsWith("module-snapshots/notebook/") ||
      key.startsWith(`documents/${actorId}/module-snapshots/notebook/`))
  );
}
export async function reconcileNotebookSnapshots(args = process.argv.slice(2)) {
  if (args.includes("--help"))
    return {
      usage:
        "node backend/scripts/reconcile-notebook-snapshots.mjs [--apply --offline]. Stop AI API/jobs before applying. Default is read-only inspection.",
    };
  if (args.some((arg) => !["--dry-run", "--apply", "--offline"].includes(arg)))
    throw new Error("Unknown reconciliation option.");
  const apply = args.includes("--apply");
  if (apply && !args.includes("--offline"))
    throw new Error(
      "Stop AI API/jobs and pass --offline before pruning private copies.",
    );
  const db = await openCopyDatabases();
  const report = {
    mode: apply ? "apply" : "dry-run",
    bound: 0,
    unbound: 0,
    processed: 0,
  };
  try {
    const copies = (
      await db.document.query(
        "SELECT id,actor_id,notebook_id,s3_key FROM module_file_snapshots WHERE scope='NOTEBOOK' AND status='READY' AND expires_at<NOW() ORDER BY id LIMIT 1000",
      )
    ).rows;
    for (const copy of copies) {
      const bound =
        (
          await db.ai.query(
            "SELECT 1 FROM notebook_ai.sources WHERE snapshot_id=$1 LIMIT 1",
            [copy.id],
          )
        ).rowCount > 0;
      report[bound ? "bound" : "unbound"]++;
      if (!apply) continue;
      if (bound)
        await db.document.query(
          "UPDATE module_file_snapshots SET expires_at=NULL,updated_at=NOW() WHERE id=$1",
          [copy.id],
        );
      else {
        if (!isNotebookSnapshotKey(copy.s3_key, copy.actor_id))
          throw new Error("Unexpected private copy scope.");
        await db.document.query("BEGIN");
        try {
          await db.document.query(
            "INSERT INTO storage_cleanup_jobs(id,s3_key) VALUES($1,$2) ON CONFLICT(s3_key) DO UPDATE SET next_attempt_at=NOW()",
            [randomUUID(), copy.s3_key],
          );
          await db.document.query(
            "DELETE FROM module_file_snapshots WHERE id=$1 AND actor_id=$2 AND notebook_id=$3",
            [copy.id, copy.actor_id, copy.notebook_id],
          );
          await db.document.query("COMMIT");
        } catch (error) {
          await db.document.query("ROLLBACK");
          throw error;
        }
      }
      report.processed++;
    }
    return report;
  } finally {
    await db.close();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  reconcileNotebookSnapshots()
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch(() => {
      console.error(
        "Snapshot reconciliation failed. Check local env, migrations and the --offline requirement. No credentials were displayed.",
      );
      process.exitCode = 1;
    });
}
