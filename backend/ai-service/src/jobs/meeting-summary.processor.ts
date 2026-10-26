import { config } from "../config/env.config";
import { rows } from "../infrastructure/database/database";
import { meetingSource } from "../modules/meeting-summary/source";
import { SpeechRecognitionError } from "../modules/meeting-summary/speech.client";
import {
  transcribeMeeting,
  summarizeMeeting,
  type MeetingPipeline,
  type MeetingSummaryState,
} from "../modules/meeting-summary/pipeline";
import { MEETING_LIMITS } from "../modules/meeting-summary/limits";

export async function processMeetingSummary(
  recordingId: string,
  runId: string,
) {
  const [state] = await rows<MeetingSummaryState>(
    `UPDATE notebook_ai.meeting_summaries SET status='RUNNING',
    stage='EXTRACTING',updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='QUEUED' RETURNING *`,
    [recordingId, runId],
  );
  if (!state) {
    // A stalled worker may have sent a paid request before dying. Require explicit retry.
    await rows(
      `UPDATE notebook_ai.meeting_summaries SET status='FAILED',error='Xử lý bị gián đoạn. Bạn có thể bấm thử lại.',updated_at=now()
      WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING'`,
      [recordingId, runId],
    );
    return;
  }
  const controller = new AbortController();
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(MEETING_LIMITS.requestTimeoutMs),
  ]);
  const started = performance.now();
  let currentStage = "EXTRACTING";
  const timings: Record<string, number> = {};
  const measure = async <T>(stage: string, run: () => Promise<T>) => {
    const start = performance.now();
    try {
      return await run();
    } finally {
      timings[stage] =
        (timings[stage] || 0) + Math.round(performance.now() - start);
    }
  };
  let checking = false;
  const authorize = async () => {
    signal.throwIfAborted();
    const current = await meetingSource(recordingId, state.actor_id, signal);
    if (current.revision !== state.revision)
      throw new Error("Recording revision changed");
    return current;
  };
  const timer = setInterval(() => {
    if (checking) return;
    checking = true;
    void authorize()
      .catch(() => controller.abort())
      .finally(() => {
        checking = false;
      });
  }, MEETING_LIMITS.accessCheckIntervalMs);
  const checkpoint = async (stage: string) => {
    currentStage = stage;
    signal.throwIfAborted();
    const result = await rows(
      `UPDATE notebook_ai.meeting_summaries SET stage=$3,transcript=$4::jsonb,
      partials=$5::jsonb,transcript_complete=$6,updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING' RETURNING recording_id`,
      [
        recordingId,
        runId,
        stage,
        JSON.stringify(state.transcript),
        JSON.stringify(state.partials),
        state.transcript_complete,
      ],
    );
    if (!result.length) throw new Error("Meeting summary run superseded");
  };
  try {
    const source = await authorize();
    const context: MeetingPipeline = {
      state,
      signal,
      authorize,
      checkpoint,
      measure,
    };
    await transcribeMeeting(source, context);
    const content = await summarizeMeeting(context);
    await rows(
      `UPDATE notebook_ai.meeting_summaries SET status='COMPLETED',stage='COMPLETED',content=$3,
      error=NULL,updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING'`,
      [recordingId, runId, content],
    );
    console.info(
      JSON.stringify({
        event: "meeting_summary",
        status: "ok",
        recording_id: recordingId,
        chunks: state.transcript.length,
        duration_ms: Math.round(performance.now() - started),
        timings,
        stt_concurrency: config.MEETING_STT_CONCURRENCY,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "meeting_summary",
        status: "failed",
        recording_id: recordingId,
        error_type:
          error instanceof Error ? error.constructor.name : "UnknownError",
        aborted: signal.aborted,
        stage: currentStage,
        provider_status:
          error instanceof SpeechRecognitionError ? error.status : undefined,
        timings,
      }),
    );
    await rows(
      `UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',
      error='Chưa thể tóm tắt bản ghi. Vui lòng kiểm tra cấu hình hoặc thử lại. Các phần đã xong được giữ lại.',updated_at=now()
      WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING'`,
      [recordingId, runId],
    );
  } finally {
    clearInterval(timer);
    controller.abort();
  }
}
