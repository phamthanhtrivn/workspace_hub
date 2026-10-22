import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { config } from "../../config/env.config";
import { db } from "../../infrastructure/database/database";
import {
  queue,
  summaryQueue,
  WORKER_HEARTBEAT_VALUE,
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
      if (
        (await redis.get("wh-notebook:worker-heartbeat")) !==
        WORKER_HEARTBEAT_VALUE
      )
        throw new Error("Notebook job worker unavailable");
      await checkHttpDependencies();
      return this.health();
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
