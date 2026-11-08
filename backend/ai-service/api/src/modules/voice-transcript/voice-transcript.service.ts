import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { config } from "../../config/env.config";
import { matchesServiceKey } from "../../common/auth/service-key";
import { rows } from "../../infrastructure/database/database";
import { meetingSummaryQueue } from "../../infrastructure/queue/notebook.queue";
import {
  VOICE_TRANSCRIPT,
  type VoiceChatType,
  type VoiceTranscriptState,
} from "./voice.constants";
import { voiceSource } from "./voice-source";

@Injectable()
export class VoiceTranscriptService {
  authorize(key?: string) {
    if (
      config.AI_ENABLED !== "true" ||
      config.VOICE_TRANSCRIPTION_ENABLED !== "true" ||
      config.COMMUNICATION_TO_AI_KEY.length < 32
    ) {
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    }
    if (!matchesServiceKey(key, config.COMMUNICATION_TO_AI_KEY))
      throw new UnauthorizedException();
  }

  async status(mediaId: string, actorId: string, chatType: VoiceChatType) {
    const source = await voiceSource(
      mediaId,
      actorId,
      chatType,
      AbortSignal.timeout(VOICE_TRANSCRIPT.sourceTimeoutMs),
    );
    return this.readState(mediaId, chatType, source.revision);
  }

  private async readState(
    mediaId: string,
    chatType: VoiceChatType,
    revision: string,
  ) {
    const [state] = await rows<VoiceTranscriptState>(
      `SELECT status,text,error FROM notebook_ai.voice_transcripts WHERE media_id=$1 AND chat_type=$2 AND revision=$3`,
      [mediaId, chatType, revision],
    );
    return state
      ? {
          status: state.status,
          text: state.status === "COMPLETED" ? state.text : null,
          error: state.error,
        }
      : { status: "NOT_CREATED", text: null, error: null };
  }

  async start(mediaId: string, actorId: string, chatType: VoiceChatType) {
    const source = await voiceSource(
      mediaId,
      actorId,
      chatType,
      AbortSignal.timeout(VOICE_TRANSCRIPT.sourceTimeoutMs),
    );
    const existing = await this.readState(mediaId, chatType, source.revision);
    if (["COMPLETED", "QUEUED", "RUNNING"].includes(existing.status))
      return existing;
    const redis = await meetingSummaryQueue.client;
    if (
      (await redis.get(VOICE_TRANSCRIPT.heartbeatKey)) !==
      VOICE_TRANSCRIPT.heartbeatValue
    ) {
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    }
    const runId = randomUUID();
    const [created] = await rows(
      `INSERT INTO notebook_ai.voice_transcripts (media_id,actor_id,chat_type,revision,run_id,status)
       VALUES($1,$2,$3,$4,$5,'QUEUED') ON CONFLICT(media_id,chat_type) DO UPDATE
       SET actor_id=$2,revision=$4,run_id=$5,status='QUEUED',text=NULL,error=NULL,updated_at=now(),
       chunks=CASE WHEN voice_transcripts.revision=$4 THEN voice_transcripts.chunks ELSE '[]'::jsonb END
       WHERE voice_transcripts.status='FAILED' OR voice_transcripts.revision<>$4 RETURNING run_id`,
      [mediaId, actorId, chatType, source.revision, runId],
    );
    if (created) {
      try {
        await meetingSummaryQueue.add(
          VOICE_TRANSCRIPT.job,
          { runId },
          {
            jobId: `${VOICE_TRANSCRIPT.jobPrefix}${runId}`,
            attempts: VOICE_TRANSCRIPT.attempts,
            backoff: {
              type: "exponential",
              delay: VOICE_TRANSCRIPT.retryDelayMs,
            },
          },
        );
      } catch {
        await rows(
          `UPDATE notebook_ai.voice_transcripts SET status='FAILED',error=$2,updated_at=now() WHERE run_id=$1 AND status='QUEUED'`,
          [runId, VOICE_TRANSCRIPT.unavailable],
        );
        throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
      }
    }
    return this.readState(mediaId, chatType, source.revision);
  }
}
