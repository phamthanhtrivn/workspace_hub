import { processConversation } from "./conversation.processor";
import { processMeetingSummary } from "./meeting-summary.processor";
import { Worker, UnrecoverableError, type Job } from "bullmq";
import { config, connection } from "../config/env.config";
import { db } from "../infrastructure/database/database";
import {
  queue,
  closeQueues,
  WORKER_HEARTBEAT_VALUE,
} from "../infrastructure/queue/notebook.queue";
import { rag } from "../infrastructure/integrations/rag.client";
import { reconcileQueuedJobs } from "./job-recovery";
import { Profile } from "../common/profiling/pipeline-profiler";
import { indexSource } from "./index.processor";
import { summarize } from "./summary.processor";
import { logError } from "../common/errors/error-log";
import { createShutdownHandler, settleAll } from "../common/shutdown";
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
    current.on("error", (error) =>
      logError("ai_worker_error", error, { queue: current.name }),
    );
    current.on("failed", (job, error) =>
      logError("ai_job_failed", error, {
        queue: current.name,
        kind: job?.name,
        id: job?.id,
        attempts_made: job?.attemptsMade,
        attempts_limit: job?.opts.attempts,
        job_age_ms: job ? Date.now() - job.timestamp : undefined,
        processing_ms: job?.processedOn
          ? Date.now() - job.processedOn
          : undefined,
      }),
    );
    current.on("stalled", (id) =>
      console.warn(
        JSON.stringify({
          event: "ai_job_stalled",
          queue: current.name,
          id,
        }),
      ),
    );
  }
  let stopping = false;
  const recoveryAbort = new AbortController();
  let recovery: Promise<unknown> | undefined;
  let heartbeatTask: Promise<unknown> | undefined;
  function reconcile() {
    if (stopping) return Promise.resolve();
    if (!recovery) {
      recovery = reconcileQueuedJobs(
        Boolean(meetingWorker),
        recoveryAbort.signal,
      ).finally(() => {
        recovery = undefined;
      });
    }
    return recovery;
  }
  const heartbeat = setInterval(() => {
    if (
      stopping ||
      heartbeatTask ||
      workers.some((current) => !current.isRunning())
    )
      return;
    heartbeatTask = queue.client
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
      .catch((error) => logError("ai_worker_heartbeat_failed", error))
      .finally(() => {
        heartbeatTask = undefined;
      });
  }, 10000);
  const sweep = setInterval(() => {
    if (config.AI_ENABLED !== "true" || stopping || recovery) return;
    void reconcile().catch((error) => logError("ai_recovery_failed", error));
  }, 30000);
  const finishShutdown = createShutdownHandler(
    "worker",
    async () => {
      try {
        await settleAll([
          ...workers.map((current) => current.close()),
          ...(recovery ? [recovery] : []),
          ...(heartbeatTask ? [heartbeatTask] : []),
        ]);
      } finally {
        await settleAll([closeQueues(), db.end()]);
      }
    },
    config.AI_SHUTDOWN_TIMEOUT_MS,
  );
  function shutdown() {
    stopping = true;
    recoveryAbort.abort();
    clearInterval(heartbeat);
    clearInterval(sweep);
    return finishShutdown();
  }
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, shutdown);
  if (config.AI_ENABLED === "true")
    void reconcile()
      .then(() =>
        stopping
          ? undefined
          : Promise.all(workers.map((current) => current.run())),
      )
      .catch((error) => {
        logError("ai_worker_startup_failed", error);
        process.exitCode = 1;
        void shutdown();
      });
  else console.log("Notebook worker disabled");
}
