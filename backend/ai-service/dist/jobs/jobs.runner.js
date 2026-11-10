"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkers = startWorkers;
const conversation_processor_1 = require("./conversation.processor");
const meeting_summary_processor_1 = require("./meeting-summary.processor");
const bullmq_1 = require("bullmq");
const env_config_1 = require("../config/env.config");
const database_1 = require("../infrastructure/database/database");
const notebook_queue_1 = require("../infrastructure/queue/notebook.queue");
const rag_client_1 = require("../infrastructure/integrations/rag.client");
const job_recovery_1 = require("./job-recovery");
const pipeline_profiler_1 = require("../common/profiling/pipeline-profiler");
const index_processor_1 = require("./index.processor");
const summary_processor_1 = require("./summary.processor");
const error_log_1 = require("../common/errors/error-log");
const shutdown_1 = require("../common/shutdown");
async function profileJob(job, pipeline, process) {
    const timing = new pipeline_profiler_1.Profile(pipeline);
    timing.set("job_age_ms", Date.now() - job.timestamp);
    if (job.attemptsMade === 0)
        timing.set("queue_wait_ms", Date.now() - job.timestamp);
    timing.set("attempt", job.attemptsMade + 1);
    let completed = false;
    try {
        const result = await timing.measure("processing_ms", process);
        completed = true;
        return result;
    }
    finally {
        timing.finish(completed ? "ok" : "failed");
    }
}
async function processConversationJob(job) {
    return profileJob(job, "job_conversation", () => (0, conversation_processor_1.processConversation)(job.data.requestId, {
        answer: job.data.answer,
        claimToken: job.data.claimToken,
        saveClaim: async (claimToken) => job.updateData({ ...job.data, claimToken }),
        save: async (answer) => job.updateData({ ...job.data, answer }),
    }));
}
async function processJob(job) {
    switch (job.name) {
        case "conversation":
            return processConversationJob(job);
        case "index":
            return profileJob(job, "job_index", () => (0, index_processor_1.indexSource)(job.data.sourceId));
        case "summary":
            return profileJob(job, "job_summary", () => (0, summary_processor_1.summarize)(job.data.artifactId));
        case "cleanup":
            return profileJob(job, "job_cleanup", () => (0, rag_client_1.rag)("/delete", job.data));
        default:
            throw new bullmq_1.UnrecoverableError("Unknown job");
    }
}
function startWorkers() {
    const worker = new bullmq_1.Worker("notebook-jobs", processJob, {
        connection: env_config_1.connection,
        prefix: "wh-notebook",
        concurrency: 1,
        autorun: false,
    });
    const summaryWorker = new bullmq_1.Worker("notebook-summary-jobs", (job) => {
        if (job.name !== "summary")
            throw new bullmq_1.UnrecoverableError("Unknown summary job");
        return processJob(job);
    }, { connection: env_config_1.connection, prefix: "wh-notebook", concurrency: 1, autorun: false });
    const conversationWorker = env_config_1.config.CONVERSATION_AI_ENABLED === "true"
        ? new bullmq_1.Worker("conversation-ai-jobs", (job) => {
            if (job.name !== "conversation")
                throw new bullmq_1.UnrecoverableError("Unknown conversation job");
            return processConversationJob(job);
        }, {
            connection: env_config_1.connection,
            prefix: "wh-notebook",
            concurrency: env_config_1.config.CONVERSATION_AI_CONCURRENCY,
            autorun: false,
        })
        : undefined;
    const meetingWorker = env_config_1.config.MEETING_SUMMARY_ENABLED === "true"
        ? new bullmq_1.Worker("meeting-summary-jobs", (job) => {
            if (job.name !== "meeting-summary")
                throw new bullmq_1.UnrecoverableError("Unknown meeting job");
            return (0, meeting_summary_processor_1.processMeetingSummary)(job.data.recordingId, job.data.runId);
        }, {
            connection: env_config_1.connection,
            prefix: "wh-notebook",
            concurrency: 1,
            autorun: false,
            maxStalledCount: 0,
        })
        : undefined;
    const workers = [
        worker,
        summaryWorker,
        ...(conversationWorker ? [conversationWorker] : []),
        ...(meetingWorker ? [meetingWorker] : []),
    ];
    for (const current of workers) {
        current.on("error", (error) => (0, error_log_1.logError)("ai_worker_error", error, { queue: current.name }));
        current.on("failed", (job, error) => (0, error_log_1.logError)("ai_job_failed", error, {
            queue: current.name,
            kind: job?.name,
            id: job?.id,
            attempts_made: job?.attemptsMade,
            attempts_limit: job?.opts.attempts,
            job_age_ms: job ? Date.now() - job.timestamp : undefined,
            processing_ms: job?.processedOn
                ? Date.now() - job.processedOn
                : undefined,
        }));
        current.on("stalled", (id) => console.warn(JSON.stringify({
            event: "ai_job_stalled",
            queue: current.name,
            id,
        })));
    }
    let stopping = false;
    const recoveryAbort = new AbortController();
    let recovery;
    let heartbeatTask;
    function reconcile() {
        if (stopping)
            return Promise.resolve();
        if (!recovery) {
            recovery = (0, job_recovery_1.reconcileQueuedJobs)(Boolean(meetingWorker), recoveryAbort.signal).finally(() => {
                recovery = undefined;
            });
        }
        return recovery;
    }
    const heartbeat = setInterval(() => {
        if (stopping ||
            heartbeatTask ||
            workers.some((current) => !current.isRunning()))
            return;
        heartbeatTask = notebook_queue_1.queue.client
            .then(async (client) => {
            if (meetingWorker)
                await client.set("wh-notebook:meeting-summary-worker-heartbeat", "ready:meeting-v1", { EX: 45 });
            if (conversationWorker)
                await client.set("wh-notebook:conversation-worker-heartbeat", "ready:conversation-v1", { EX: 45 });
            return client.set("wh-notebook:worker-heartbeat", notebook_queue_1.WORKER_HEARTBEAT_VALUE, {
                EX: 45,
            });
        })
            .catch((error) => (0, error_log_1.logError)("ai_worker_heartbeat_failed", error))
            .finally(() => {
            heartbeatTask = undefined;
        });
    }, 10000);
    const sweep = setInterval(() => {
        if (env_config_1.config.AI_ENABLED !== "true" || stopping || recovery)
            return;
        void reconcile().catch((error) => (0, error_log_1.logError)("ai_recovery_failed", error));
    }, 30000);
    const finishShutdown = (0, shutdown_1.createShutdownHandler)("worker", async () => {
        try {
            await (0, shutdown_1.settleAll)([
                ...workers.map((current) => current.close()),
                ...(recovery ? [recovery] : []),
                ...(heartbeatTask ? [heartbeatTask] : []),
            ]);
        }
        finally {
            await (0, shutdown_1.settleAll)([(0, notebook_queue_1.closeQueues)(), database_1.db.end()]);
        }
    }, env_config_1.config.AI_SHUTDOWN_TIMEOUT_MS);
    function shutdown() {
        stopping = true;
        recoveryAbort.abort();
        clearInterval(heartbeat);
        clearInterval(sweep);
        return finishShutdown();
    }
    for (const signal of ["SIGINT", "SIGTERM"])
        process.on(signal, shutdown);
    if (env_config_1.config.AI_ENABLED === "true")
        void reconcile()
            .then(() => stopping
            ? undefined
            : Promise.all(workers.map((current) => current.run())))
            .catch((error) => {
            (0, error_log_1.logError)("ai_worker_startup_failed", error);
            process.exitCode = 1;
            void shutdown();
        });
    else
        console.log("Notebook worker disabled");
}
