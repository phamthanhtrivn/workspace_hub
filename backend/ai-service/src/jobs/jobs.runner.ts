import { processConversation } from "./conversation.processor";
import { processMeetingSummary } from "./meeting-summary.processor";
import { Worker, UnrecoverableError, type Job } from "bullmq";
import { config, connection } from "../config/env.config";
import { db, rows } from "../infrastructure/database/database";
import {
  enqueue,
  queue,
  closeQueues,
  WORKER_HEARTBEAT_VALUE,
  meetingSummaryQueue,
} from "../infrastructure/queue/notebook.queue";
import { rag } from "../infrastructure/integrations/rag.client";
import { recoverInterruptedJobs } from "./job-recovery";
import { Profile } from "../common/profiling/pipeline-profiler";
import { indexSource } from "./index.processor";
import { summarize } from "./summary.processor";
async function processConversationJob(job: Job) {
  const timing = new Profile("job_conversation");
  timing.set("job_age_ms", Date.now() - job.timestamp);
  if (job.attemptsMade === 0)
    timing.set("queue_wait_ms", Date.now() - job.timestamp);
  timing.set("attempt", job.attemptsMade + 1);
  let completed = false;
  try {
    await timing.measure("processing_ms", () =>
      processConversation(job.data.requestId, {
        answer: job.data.answer,
        claimToken: job.data.claimToken,
        saveClaim: async (claimToken) =>
          job.updateData({ ...job.data, claimToken }),
        save: async (answer) => job.updateData({ ...job.data, answer }),
      }),
    );
    completed = true;
  } finally {
    timing.finish(completed ? "ok" : "failed");
  }
}
async function processJob(job: Job) {
  if (!["index", "summary", "cleanup", "conversation"].includes(job.name))
    throw new UnrecoverableError("Unknown job");
  if (job.name === "conversation") return processConversationJob(job);
  const timing = new Profile(
    `job_${job.name}` as "job_index" | "job_summary" | "job_cleanup",
  );
  timing.set("job_age_ms", Date.now() - job.timestamp);
  // Retry age includes previous work/backoff, so don't label it as pure queue wait.
  if (job.attemptsMade === 0)
    timing.set("queue_wait_ms", Date.now() - job.timestamp);
  timing.set("attempt", job.attemptsMade + 1);
  let completed = false;
  try {
    const result = await timing.measure("processing_ms", () => {
      if (job.name === "index") return indexSource(job.data.sourceId);
      if (job.name === "summary") return summarize(job.data.artifactId);
      return rag("/delete", job.data);
    });
    completed = true;
    return result;
  } finally {
    timing.finish(completed ? "ok" : "failed");
  }
}
export function startWorkers() {
  const worker = new Worker("notebook-jobs", processJob, {
    connection,
    prefix: "wh-notebook",
    concurrency: 1,
    autorun: false,
  });
  const summaryWorker = new Worker(
    "notebook-summary-jobs",
    (job) => {
      if (job.name !== "summary")
        throw new UnrecoverableError("Unknown summary job");
      return processJob(job);
    },
    { connection, prefix: "wh-notebook", concurrency: 1, autorun: false },
  );
  const conversationWorker =
    config.CONVERSATION_AI_ENABLED === "true"
      ? new Worker(
          "conversation-ai-jobs",
          (job) => {
            if (job.name !== "conversation")
              throw new UnrecoverableError("Unknown conversation job");
            return processConversationJob(job);
          },
          {
            connection,
            prefix: "wh-notebook",
            concurrency: config.CONVERSATION_AI_CONCURRENCY,
            autorun: false,
          },
        )
      : undefined;
  const meetingWorker =
    config.MEETING_SUMMARY_ENABLED === "true"
      ? new Worker(
          "meeting-summary-jobs",
          (job) => {
            if (job.name !== "meeting-summary")
              throw new UnrecoverableError("Unknown meeting job");
            return processMeetingSummary(job.data.recordingId, job.data.runId);
          },
          {
            connection,
            prefix: "wh-notebook",
            concurrency: 1,
            autorun: false,
            maxStalledCount: 0,
          },
        )
      : undefined;
  const workers = [
    worker,
    summaryWorker,
    ...(conversationWorker ? [conversationWorker] : []),
    ...(meetingWorker ? [meetingWorker] : []),
  ];
  for (const current of workers) {
    current.on("error", () =>
      console.error("Notebook queue connection failed"),
    );
    current.on("failed", (job) =>
      console.error("Notebook job failed", { type: job?.name, id: job?.id }),
    );
  }
  const heartbeat = setInterval(() => {
    if (workers.some((current) => !current.isRunning())) return;
    void queue.client
      .then(async (client) => {
        if (meetingWorker)
          await client.set(
            "wh-notebook:meeting-summary-worker-heartbeat",
            "ready:meeting-v1",
            { EX: 45 },
          );
        if (conversationWorker)
          await client.set(
            "wh-notebook:conversation-worker-heartbeat",
            "ready:conversation-v1",
            { EX: 45 },
          );
        return client.set(
          "wh-notebook:worker-heartbeat",
          WORKER_HEARTBEAT_VALUE,
          {
            EX: 45,
          },
        );
      })
      .catch(() => console.error("Notebook worker heartbeat unavailable"));
  }, 10000);
  async function reconcile() {
    if (meetingWorker) {
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
  let reconciling = false;
  const sweep = setInterval(() => {
    if (config.AI_ENABLED !== "true") return;
    if (reconciling) return;
    reconciling = true;
    void reconcile()
      .catch(() => console.error("Notebook queue recovery failed"))
      .finally(() => {
        reconciling = false;
      });
  }, 30000);
  if (config.AI_ENABLED === "true")
    void reconcile()
      .then(() => Promise.all(workers.map((current) => current.run())))
      .catch(() => {
        console.error("Notebook worker startup failed");
        process.exitCode = 1;
        shutdown();
      });
  else console.log("Notebook worker disabled");
  let stopping = false;
  function shutdown() {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeat);
    clearInterval(sweep);
    void Promise.all(workers.map((current) => current.close()))
      .then(() => Promise.all([closeQueues(), db.end()]))
      .catch(() => {
        console.error("Notebook worker shutdown failed");
        process.exitCode = 1;
      });
  }
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, shutdown);
}
