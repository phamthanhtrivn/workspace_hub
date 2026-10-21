import { Queue } from "bullmq";
import { config, connection } from "./config";
export const queue = new Queue("notebook-jobs", {
  connection: {
    ...connection,
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
});
let lastError = 0;
queue.on("error", () => {
  if (Date.now() - lastError > 30000) {
    lastError = Date.now();
    console.error("Notebook Redis connection unavailable");
  }
});
export async function enqueue(kind: string, id: string, data: object) {
  const jobId = `${kind}-${id}`;
  const old = await queue.getJob(jobId);
  if (old && ["failed", "completed"].includes(await old.getState()))
    await old.remove();
  if (config.AI_ENABLED === "true") await queue.add(kind, data, { jobId });
}
