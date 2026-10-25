import { rows } from "../infrastructure/database/database";
import {
  findQueuedJob,
  enqueue,
  meetingSummaryQueue,
} from "../infrastructure/queue/notebook.queue";

export async function recoverInterruptedJobs() {
  const candidates = await rows<{ id: string; kind: string }>(
    `SELECT id,'index' AS kind FROM notebook_ai.sources
     WHERE status='INDEXING' AND updated_at<now()-interval '6 minutes'
     UNION ALL
     SELECT id,'summary' AS kind FROM notebook_ai.artifacts
     WHERE status='RUNNING' AND updated_at<now()-interval '10 minutes'`,
  );
  for (const item of candidates) {
    const job = await findQueuedJob(item.kind, item.id);
    const state = job ? await job.getState() : "missing";
    // BullMQ owns stalled-job detection and locks. Never steal active/waiting work.
    if (!["failed", "completed", "missing", "unknown"].includes(state))
      continue;
    if (item.kind === "index") {
      await rows(
        `UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now()
         WHERE id=$1 AND status='INDEXING' AND updated_at<now()-interval '6 minutes'`,
        [
          item.id,
          "INDEX_INTERRUPTED: Worker bị gián đoạn. Bấm Thử lại để lập chỉ mục.",
        ],
      );
    } else {
      await rows(
        `UPDATE notebook_ai.artifacts SET status='FAILED',error=$2,updated_at=now()
         WHERE id=$1 AND status='RUNNING' AND updated_at<now()-interval '10 minutes'`,
        [
          item.id,
          "SUMMARY_INTERRUPTED: Worker bị gián đoạn. Các phần đã xong được giữ; chủ động tiếp tục, không tự gọi lại LLM.",
        ],
      );
    }
  }
}

export async function reconcileQueuedJobs(includeMeetings: boolean) {
  if (includeMeetings) {
    for (const item of await rows(`SELECT recording_id,run_id,status FROM notebook_ai.meeting_summaries
      WHERE status IN ('QUEUED','RUNNING') AND updated_at<now()-interval '2 minutes'`)) {
      const job = await meetingSummaryQueue.getJob(`meeting-${item.run_id}`);
      const state = job ? await job.getState() : "missing";
      if (!["missing", "failed", "completed", "unknown"].includes(state))
        continue;
      await rows(
        `UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',
        error='Xử lý bị gián đoạn. Bạn có thể bấm thử lại.',updated_at=now()
        WHERE recording_id=$1 AND run_id=$2 AND status IN ('QUEUED','RUNNING')`,
        [item.recording_id, item.run_id],
      );
    }
  }
  await recoverInterruptedJobs();
  // Redis is durable, but recover jobs stranded between the SQL commit and queue write too.
  await rows(
    "UPDATE notebook_ai.requests SET status='FAILED' WHERE status='RUNNING' AND created_at<now()-interval '3 minutes'",
  );
  for (const source of await rows(
    "SELECT id FROM notebook_ai.sources WHERE status='QUEUED'",
  ))
    await enqueue("index", source.id, { sourceId: source.id });
  for (const artifact of await rows(
    "SELECT id FROM notebook_ai.artifacts WHERE status='QUEUED'",
  ))
    await enqueue("summary", artifact.id, { artifactId: artifact.id });
}
