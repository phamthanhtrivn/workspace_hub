import { rows } from "../infrastructure/database/database";
import { findQueuedJob } from "../infrastructure/queue/notebook.queue";

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
