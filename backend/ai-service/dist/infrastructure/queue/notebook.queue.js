"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingSummaryQueue = exports.summaryQueue = exports.conversationQueue = exports.queue = exports.WORKER_HEARTBEAT_VALUE = void 0;
exports.enqueue = enqueue;
exports.findQueuedJob = findQueuedJob;
exports.closeQueues = closeQueues;
const bullmq_1 = require("bullmq");
const env_config_1 = require("../../config/env.config");
exports.WORKER_HEARTBEAT_VALUE = "ready:split-v1";
const options = {
    connection: {
        ...env_config_1.connection,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 5000,
    },
    prefix: "wh-notebook",
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
    },
};
exports.queue = new bullmq_1.Queue("notebook-jobs", options);
exports.conversationQueue = new bullmq_1.Queue("conversation-ai-jobs", options);
exports.summaryQueue = new bullmq_1.Queue("notebook-summary-jobs", options);
exports.meetingSummaryQueue = new bullmq_1.Queue("meeting-summary-jobs", options);
let lastError = 0;
for (const current of [exports.queue, exports.summaryQueue, exports.conversationQueue, exports.meetingSummaryQueue])
    current.on("error", () => {
        if (Date.now() - lastError > 30000) {
            lastError = Date.now();
            console.error("Notebook Redis connection unavailable");
        }
    });
async function enqueue(kind, id, data) {
    if (env_config_1.config.AI_ENABLED !== "true")
        return;
    const jobId = `${kind}-${id}`;
    const target = kind === "conversation"
        ? exports.conversationQueue
        : kind === "summary"
            ? exports.summaryQueue
            : exports.queue;
    if (target !== exports.queue) {
        const legacy = await exports.queue.getJob(jobId);
        if (legacy && !["failed", "completed"].includes(await legacy.getState()))
            return;
    }
    const old = await target.getJob(jobId);
    if (old && ["failed", "completed"].includes(await old.getState()))
        await old.remove();
    await target.add(kind, data, { jobId });
}
async function findQueuedJob(kind, id) {
    const jobId = `${kind}-${id}`;
    if (kind !== "summary")
        return exports.queue.getJob(jobId);
    const legacy = await exports.queue.getJob(jobId);
    if (legacy && !["failed", "completed"].includes(await legacy.getState()))
        return legacy;
    return (await exports.summaryQueue.getJob(jobId)) ?? legacy;
}
async function closeQueues() {
    await Promise.all([
        exports.queue.close(),
        exports.summaryQueue.close(),
        exports.conversationQueue.close(),
        exports.meetingSummaryQueue.close(),
    ]);
}
