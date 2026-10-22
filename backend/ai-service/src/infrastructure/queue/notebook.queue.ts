import { Queue, type Job } from "bullmq";
import { config, connection } from "../../config/env.config";
export const WORKER_HEARTBEAT_VALUE = "ready:split-v1";
const options = {
  connection: {
    ...connection,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 5000,
  },
  prefix: "wh-notebook",
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 10000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
};
export const queue = new Queue("notebook-jobs", options);
export const summaryQueue = new Queue("notebook-summary-jobs", options);
let lastError = 0;
for (const current of [queue, summaryQueue])
  current.on("error", () => {
    if (Date.now() - lastError > 30000) {
      lastError = Date.now();
      console.error("Notebook Redis connection unavailable");
    }
  });
export async function enqueue(kind: string, id: string, data: object) {
  if (config.AI_ENABLED !== "true") return;
  const jobId = `${kind}-${id}`;
  const target = kind === "summary" ? summaryQueue : queue;
  if (kind === "summary") {
    const legacy = await queue.getJob(jobId);
    if (legacy && !["failed", "completed"].includes(await legacy.getState()))
      return;
  }
  const old = await target.getJob(jobId);
  if (old && ["failed", "completed"].includes(await old.getState()))
    await old.remove();
  await target.add(kind, data, { jobId });
}

export async function findQueuedJob(
  kind: string,
  id: string,
): Promise<Job | undefined> {
  const jobId = `${kind}-${id}`;
  if (kind !== "summary") return queue.getJob(jobId);
  const legacy = await queue.getJob(jobId);
  if (legacy && !["failed", "completed"].includes(await legacy.getState()))
    return legacy;
  return (await summaryQueue.getJob(jobId)) ?? legacy;
}

export async function closeQueues() {
  await Promise.all([queue.close(), summaryQueue.close()]);
}
