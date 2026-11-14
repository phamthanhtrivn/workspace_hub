import type { Job } from "bullmq";
import { rows } from "../infrastructure/database/database";
import {
  findQueuedJob,
  enqueue,
  meetingSummaryQueue,
} from "../infrastructure/queue/notebook.queue";

import { logError } from "../common/errors/error-log";
import { config } from "../config/env.config";
import { VOICE_TRANSCRIPT } from "../modules/voice-transcript/voice.constants";
import { rag } from "../infrastructure/integrations/rag.client";

const RECOVERY_BATCH_SIZE = 100;
// BullMQ owns stalled-job detection and locks. Never steal active/waiting work.
const GONE_JOB_STATES = ["missing", "failed", "completed", "unknown"];

async function jobIsGone(job: Job | undefined) {
  return !job || GONE_JOB_STATES.includes(await job.getState());
}

/** Runs an `UPDATE ... RETURNING` and reports whether any row changed. */
async function changed(sql: string, args: unknown[]) {
  return (await rows(sql, args)).length > 0;
}
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
     WHERE status='INDEXING' AND updated_at<now()-interval '6 minutes'`,
    async (item) => {
      if (!(await jobIsGone(await findQueuedJob(item.kind, item.id))))
        return false;

      return changed(
        `UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now()
         WHERE id=$1 AND status='INDEXING' AND updated_at<now()-interval '6 minutes' RETURNING id`,
        [
          item.id,
          "INDEX_INTERRUPTED: Worker bị gián đoạn. Bấm Thử lại để lập chỉ mục.",
        ],
      );
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
  const cleanup = await rows<{
    id: string;
    scope_id: string;
    source_id: string | null;
  }>(
    "SELECT * FROM notebook_ai.cleanup_outbox ORDER BY created_at,id LIMIT 100",
  );
  for (const item of cleanup) {
    if (signal?.aborted) break;
    try {
      await rag("/delete", {
        scopeId: item.scope_id,
        sourceId: item.source_id,
      });
      await rows("DELETE FROM notebook_ai.cleanup_outbox WHERE id=$1", [
        item.id,
      ]);
    } catch (error) {
      logError("ai_cleanup_failed", error, { id: item.id });
      break;
    }
  }
  if (config.VOICE_TRANSCRIPTION_ENABLED === "true") {
    stages.push(
      await recoverBatches(
        "voice-transcripts",
        `SELECT run_id AS id,'voice' AS kind,run_id FROM notebook_ai.voice_transcripts
       WHERE status IN ('QUEUED','RUNNING') AND updated_at<now()-interval '2 minutes'`,
        async (item) => {
          const job = await meetingSummaryQueue.getJob(
            `${VOICE_TRANSCRIPT.jobPrefix}${item.run_id}`,
          );

          return (
            (await jobIsGone(job)) &&
            changed(
              `UPDATE notebook_ai.voice_transcripts SET status='FAILED',error=$2,updated_at=now()
          WHERE run_id=$1 AND status IN ('QUEUED','RUNNING') AND updated_at<now()-interval '2 minutes' RETURNING run_id`,
              [item.run_id, VOICE_TRANSCRIPT.interrupted],
            )
          );
        },
        signal,
      ),
    );
  }
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

          return (
            (await jobIsGone(job)) &&
            changed(
              `UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',
        error='Xử lý bị gián đoạn. Bạn có thể bấm thử lại.',updated_at=now()
        WHERE recording_id=$1 AND run_id=$2 AND status IN ('QUEUED','RUNNING')
        AND updated_at<now()-interval '2 minutes' RETURNING recording_id`,
              [item.id, item.run_id],
            )
          );
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
      (item) =>
        changed(
          `UPDATE notebook_ai.requests SET status='FAILED',updated_at=now()
         WHERE id=$1 AND status='RUNNING' AND created_at<now()-interval '3 minutes' RETURNING id`,
          [item.id],
        ),
      signal,
    ),
  );
  stages.push(
    await recoverBatches(
      "queued_index",
      "SELECT id,'index' AS kind FROM notebook_ai.sources WHERE status='QUEUED'",
      async (item) => {
        await enqueue("index", item.id, { sourceId: item.id });

        return true;
      },
      signal,
    ),
  );
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
