import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { config } from "../../config/env.config";
import { db } from "../../infrastructure/database/database";
import {
  queue,
  summaryQueue,
  conversationQueue,
  WORKER_HEARTBEAT_VALUE,
  meetingSummaryQueue,
} from "../../infrastructure/queue/notebook.queue";
import { checkHttpDependencies } from "./http-dependencies";
@Controller()
export class HealthController {
  @Get("health") health() {
    return {
      status: "ok",
      service: "notebook-ai",
      enabled: config.AI_ENABLED === "true",
    };
  }
  @Get("ready") async ready() {
    try {
      await db.query("SELECT id FROM notebook_ai.notebooks LIMIT 0");
      await Promise.all([
        queue.getJobCounts("waiting"),
        summaryQueue.getJobCounts("waiting"),
      ]);
      const redis = await queue.client;
      if (config.MEETING_SUMMARY_ENABLED === "true") {
        await meetingSummaryQueue.getJobCounts("waiting");
        if (
          (await redis.get("wh-notebook:meeting-summary-worker-heartbeat")) !==
          "ready:meeting-v1"
        )
          throw new Error("Meeting summary worker unavailable");
      }
      if (
        (await redis.get("wh-notebook:worker-heartbeat")) !==
        WORKER_HEARTBEAT_VALUE
      )
        throw new Error("Notebook job worker unavailable");
      if (config.CONVERSATION_AI_ENABLED === "true") {
        await conversationQueue.getJobCounts("waiting");
        if (
          (await redis.get("wh-notebook:conversation-worker-heartbeat")) !==
          "ready:conversation-v1"
        )
          throw new Error("Conversation worker unavailable");
      }
      await checkHttpDependencies();
      return this.health();
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
