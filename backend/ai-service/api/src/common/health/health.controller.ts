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
import { VOICE_TRANSCRIPT } from "../../modules/voice-transcript/voice.constants";
import { logError } from "../errors/error-log";
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
    let stage = "DATABASE";
    try {
      await Promise.all([
        db.query("SELECT id FROM notebook_ai.notebooks LIMIT 0"),
        db.query(
          "SELECT artifact_id,artifact_run_id FROM notebook_ai.requests LIMIT 0",
        ),
        db.query("SELECT run_id FROM notebook_ai.sources LIMIT 0"),
        db.query("SELECT run_id FROM notebook_ai.artifacts LIMIT 0"),
        db.query(
          "SELECT id,scope_id,source_id FROM notebook_ai.cleanup_outbox LIMIT 0",
        ),
      ]);
      stage = "QUEUE";
      await Promise.all([
        queue.getJobCounts("waiting"),
        summaryQueue.getJobCounts("waiting"),
      ]);
      const redis = await queue.client;
      if (config.VOICE_TRANSCRIPTION_ENABLED === "true") {
        await db.query(
          "SELECT media_id FROM notebook_ai.voice_transcripts LIMIT 0",
        );
        await meetingSummaryQueue.getJobCounts("waiting");
        if (
          (await redis.get(VOICE_TRANSCRIPT.heartbeatKey)) !==
          VOICE_TRANSCRIPT.heartbeatValue
        ) {
          throw new Error(VOICE_TRANSCRIPT.unavailable);
        }
      }
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
      stage = "DEPENDENCIES";
      const capabilities = await checkHttpDependencies();

      return { ...this.health(), capabilities };
    } catch (error) {
      logError("ai_readiness_failed", error, { stage });
      throw new ServiceUnavailableException({
        code: `AI_${stage}_UNAVAILABLE`,
        message: `AI_${stage}_UNAVAILABLE: AI dependency is unavailable. Please try again later.`,
      });
    }
  }
}
