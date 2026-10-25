import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "../../config/env.config";
import { rows } from "../../infrastructure/database/database";
import { meetingSummaryQueue } from "../../infrastructure/queue/notebook.queue";
import { meetingSource } from "./source";

@Controller("internal/meeting-summaries")
export class MeetingSummaryController {
  private authorize(key: string) {
    const expected = config.AI_COMMUNICATION_SERVICE_KEY;
    if (
      config.AI_ENABLED !== "true" ||
      config.MEETING_SUMMARY_ENABLED !== "true" ||
      expected.length < 32
    )
      throw new ServiceUnavailableException(
        "Meeting summaries are not configured",
      );
    if (
      typeof key !== "string" ||
      Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
    )
      throw new UnauthorizedException();
  }

  @Post(":id/status")
  async status(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key: string,
  ) {
    this.authorize(key);
    const [summary] = await rows(
      `SELECT status,stage,content,error,updated_at AS "updatedAt",
      jsonb_array_length(transcript) AS "transcribedChunks" FROM notebook_ai.meeting_summaries WHERE recording_id=$1`,
      [id],
    );
    return summary ?? { status: "NOT_CREATED" };
  }

  @Post(":id")
  async start(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key: string,
    @Body("actorId", ParseUUIDPipe) actorId: string,
  ) {
    this.authorize(key);
    const redis = await meetingSummaryQueue.client;
    if (
      (await redis.get("wh-notebook:meeting-summary-worker-heartbeat")) !==
      "ready:meeting-v1"
    )
      throw new ServiceUnavailableException(
        "Meeting summary worker is unavailable",
      );
    const source = await meetingSource(id, actorId, AbortSignal.timeout(15000));
    const runId = randomUUID();
    const [created] = await rows(
      `INSERT INTO notebook_ai.meeting_summaries
      (recording_id,run_id,actor_id,revision,status) VALUES($1,$2,$3,$4,'QUEUED')
      ON CONFLICT(recording_id) DO UPDATE SET run_id=$2,actor_id=$3,revision=$4,status='QUEUED',
      stage='QUEUED',content=NULL,error=NULL,updated_at=now(),
      transcript=CASE WHEN meeting_summaries.revision=$4 THEN meeting_summaries.transcript ELSE '[]'::jsonb END,
      partials=CASE WHEN meeting_summaries.revision=$4 THEN meeting_summaries.partials ELSE '[]'::jsonb END
      ,transcript_complete=CASE WHEN meeting_summaries.revision=$4 THEN meeting_summaries.transcript_complete ELSE false END
      WHERE meeting_summaries.status='FAILED' OR
        (meeting_summaries.status='COMPLETED' AND meeting_summaries.revision<>$4)
      RETURNING run_id`,
      [id, runId, actorId, source.revision],
    );
    if (created) {
      try {
        await meetingSummaryQueue.add(
          "meeting-summary",
          { recordingId: id, runId },
          {
            jobId: `meeting-${runId}`,
            attempts: 1,
          },
        );
      } catch {
        await rows(
          `UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',error='Không thể xếp lịch xử lý. Vui lòng thử lại.',updated_at=now()
          WHERE recording_id=$1 AND run_id=$2 AND status='QUEUED'`,
          [id, runId],
        );
        throw new ServiceUnavailableException("Meeting queue unavailable");
      }
    }
    return this.status(id, key);
  }
}
