import { rows } from "../infrastructure/database/database";
import {
  findQueuedJob,
  enqueue,
  meetingSummaryQueue,
} from "../infrastructure/queue/notebook.queue";

import { logError } from "../common/errors/error-log";

const RECOVERY_BATCH_SIZE = 100;
type Candidate = { id: string; kind: string; run_id?: string };
type RecoveryCounts = { checked: number; recovered: number; failed: number };

async function recoverBatches(
  stage: string,
  query: string,
  recover: (item: Candidate) => Promise<boolean>,
  signal?: AbortSignal,
): Promise<RecoveryCounts> {
  const counts = { checked: 0, recovered: 0, failed: 0 };
  let cursor: Candidate | undefined;
  while (!signal?.aborted) {
    let batch: Candidate[];
    try {
      batch = await rows<Candidate>(
        `SELECT * FROM (${query}) AS candidates
         WHERE ($1::text IS NULL OR (kind,id)>($1::text,$2::uuid))
         ORDER BY kind,id LIMIT $3`,
        [cursor?.kind ?? null, cursor?.id ?? null, RECOVERY_BATCH_SIZE],
      );
    } catch (error) {
      counts.failed++;
      logError("ai_recovery_scan_failed", error, { stage });
      break;
    }
    for (const item of batch) {
      if (signal?.aborted) break;
      counts.checked++;
      try {
        if (await recover(item)) counts.recovered++;
      } catch (error) {
        counts.failed++;
        logError("ai_recovery_job_failed", error, {
          stage,
          kind: item.kind,
          id: item.id,
        });
      }
    }
    if (batch.length < RECOVERY_BATCH_SIZE) break;
    // Advance even when a job fails or stays active, so it cannot starve later jobs.
    cursor = batch[batch.length - 1];
  }
  return counts;
}

export function recoverInterruptedJobs(signal?: AbortSignal) {
  return recoverBatches(
    "interrupted",
    `SELECT id,'index' AS kind FROM notebook_ai.sources
     WHERE status='INDEXING' AND updated_at<now()-interval '6 minutes'
     UNION ALL
     SELECT id,'summary' AS kind FROM notebook_ai.artifacts
     WHERE status='RUNNING' AND updated_at<now()-interval '10 minutes'`,
    async (item) => {
      const job = await findQueuedJob(item.kind, item.id);
      const state = job ? await job.getState() : "missing";
      // BullMQ owns stalled-job detection and locks. Never steal active/waiting work.
      if (!["failed", "completed", "missing", "unknown"].includes(state))
        return false;
      if (item.kind === "index") {
        const updated = await rows(
          `UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now()
         WHERE id=$1 AND status='INDEXING' AND updated_at<now()-interval '6 minutes' RETURNING id`,
          [
            item.id,
            "INDEX_INTERRUPTED: Worker bị gián đoạn. Bấm Thử lại để lập chỉ mục.",
          ],
        );
        return updated.length > 0;
      } else {
        const updated = await rows(
          `UPDATE notebook_ai.artifacts SET status='FAILED',error=$2,updated_at=now()
         WHERE id=$1 AND status='RUNNING' AND updated_at<now()-interval '10 minutes' RETURNING id`,
          [
            item.id,
            "SUMMARY_INTERRUPTED: Worker bị gián đoạn. Các phần đã xong được giữ; chủ động tiếp tục, không tự gọi lại LLM.",
          ],
        );
        return updated.length > 0;
      }
    },
    signal,
  );
}

export async function reconcileQueuedJobs(
  includeMeetings: boolean,
  signal?: AbortSignal,
) {
  const started = performance.now();
  const stages: RecoveryCounts[] = [];
  if (includeMeetings) {
    stages.push(
      await recoverBatches(
        "meetings",
        `SELECT recording_id AS id,'meeting' AS kind,run_id FROM notebook_ai.meeting_summaries
       WHERE status IN ('QUEUED','RUNNING') AND updated_at<now()-interval '2 minutes'`,
        async (item) => {
          const job = await meetingSummaryQueue.getJob(
            `meeting-${item.run_id}`,
          );
          const state = job ? await job.getState() : "missing";
          if (!["missing", "failed", "completed", "unknown"].includes(state))
            return false;
          const updated = await rows(
            `UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',
        error='Xử lý bị gián đoạn. Bạn có thể bấm thử lại.',updated_at=now()
        WHERE recording_id=$1 AND run_id=$2 AND status IN ('QUEUED','RUNNING')
        AND updated_at<now()-interval '2 minutes' RETURNING recording_id`,
            [item.id, item.run_id],
          );
          return updated.length > 0;
        },
        signal,
      ),
    );
  }
  stages.push(await recoverInterruptedJobs(signal));
  // Redis is durable, but recover jobs stranded between the SQL commit and queue write too.
  stages.push(
    await recoverBatches(
      "requests",
      `SELECT id,'request' AS kind FROM notebook_ai.requests
     WHERE status='RUNNING' AND created_at<now()-interval '3 minutes'`,
      async (item) => {
        const updated = await rows(
          `UPDATE notebook_ai.requests SET status='FAILED',updated_at=now()
         WHERE id=$1 AND status='RUNNING' AND created_at<now()-interval '3 minutes' RETURNING id`,
          [item.id],
        );
        return updated.length > 0;
      },
      signal,
    ),
  );
  for (const [kind, table] of [
    ["index", "sources"],
    ["summary", "artifacts"],
  ] as const) {
    stages.push(
      await recoverBatches(
        `queued_${kind}`,
        `SELECT id,'${kind}' AS kind FROM notebook_ai.${table} WHERE status='QUEUED'`,
        async (item) => {
          await enqueue(
            kind,
            item.id,
            kind === "index" ? { sourceId: item.id } : { artifactId: item.id },
          );
          return true;
        },
        signal,
      ),
    );
  }
  const counts = stages.reduce(
    (total, stage) => ({
      checked: total.checked + stage.checked,
      recovered: total.recovered + stage.recovered,
      failed: total.failed + stage.failed,
    }),
    { checked: 0, recovered: 0, failed: 0 },
  );
  console.info(
    JSON.stringify({
      event: "ai_recovery",
      ...counts,
      duration_ms: Math.round(performance.now() - started),
      aborted: signal?.aborted ?? false,
    }),
  );
  return counts;
}
