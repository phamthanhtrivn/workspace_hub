import { mkdtemp, rm } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { config } from "../config/env.config";
import { rows } from "../infrastructure/database/database";
import { meetingSource } from "../modules/meeting-summary/source";
import {
  prepareMeetingAudio,
  AUDIO_CHUNK_SECONDS,
} from "../modules/meeting-summary/media";
import {
  recognizeMeetingChunk,
  SpeechRecognitionError,
} from "../modules/meeting-summary/speech.client";
import {
  meetingSummaryText,
  meetingSummaryCacheKey,
  transcriptBatches,
  type TranscriptChunk,
} from "../modules/meeting-summary/summary";

type SummaryRow = {
  actor_id: string;
  revision: string;
  transcript: TranscriptChunk[];
  transcript_complete: boolean;
  partials: { hash: string; text: string }[];
};

export async function processMeetingSummary(
  recordingId: string,
  runId: string,
) {
  const [state] = await rows<SummaryRow>(
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
    AbortSignal.timeout(45 * 60 * 1000),
  ]);
  const started = performance.now();
  let directory: string | undefined;
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
  }, 15000);
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
    if (!state.transcript_complete) {
      directory = await mkdtemp(join(tmpdir(), "meeting-summary-"));
      const workDirectory = directory;
      const files = await measure("audio_ms", () =>
        prepareMeetingAudio(source, workDirectory, signal),
      );
      const completed = new Set(
        state.transcript.map(
          (chunk) => chunk.startSeconds / AUDIO_CHUNK_SECONDS,
        ),
      );
      if (
        completed.size !== state.transcript.length ||
        [...completed].some(
          (index) =>
            !Number.isInteger(index) || index < 0 || index >= files.length,
        )
      )
        throw new Error("Invalid transcript checkpoint");
      const pending = files
        .map((_file, index) => index)
        .filter((index) => !completed.has(index));
      await checkpoint("TRANSCRIBING");
      for (
        let offset = 0;
        offset < pending.length;
        offset += config.MEETING_STT_CONCURRENCY
      ) {
        const wave = pending.slice(
          offset,
          offset + config.MEETING_STT_CONCURRENCY,
        );
        const results = await measure("speech_ms", () =>
          Promise.allSettled(
            wave.map(async (index) => {
              await authorize();
              const text = await recognizeMeetingChunk(files[index], signal);
              signal.throwIfAborted();
              return { startSeconds: index * AUDIO_CHUNK_SECONDS, text };
            }),
          ),
        );
        // Drain all in-flight calls before cleanup, and preserve successes even if another chunk failed.
        for (const result of results)
          if (result.status === "fulfilled")
            state.transcript.push(result.value);
        state.transcript.sort((a, b) => a.startSeconds - b.startSeconds);
        await checkpoint("TRANSCRIBING");
        const failed = results.find((result) => result.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;
      }
      state.transcript_complete = true;
      await checkpoint("TRANSCRIBING");
    }
    let batches = transcriptBatches(state.transcript);
    if (!batches.length) throw new Error("No speech recognized");
    await checkpoint("SUMMARIZING");
    // Each level shrinks the input; checkpoint completed model outputs for explicit retries.
    for (let level = 0; batches.length > 1; level++) {
      if (level >= 6) throw new Error("Meeting summary reduction limit");
      const notes: string[] = [];
      for (const batch of batches) {
        const hash = meetingSummaryCacheKey(batch);
        let saved = state.partials.find((item) => item.hash === hash);
        if (!saved) {
          await authorize();
          const text = await measure("model_ms", () =>
            meetingSummaryText(batch, false, signal),
          );
          if (text.length > 6000)
            throw new Error("Meeting notes did not shrink");
          saved = { hash, text };
          state.partials.push(saved);
          await checkpoint("SUMMARIZING");
        }
        notes.push(saved.text);
      }
      batches = [];
      let group = "";
      for (const note of notes) {
        if (group.length + note.length + 2 > 16000) {
          batches.push(group);
          group = "";
        }
        group += (group ? "\n\n" : "") + note;
      }
      if (group) batches.push(group);
    }
    await authorize();
    const content = await measure("model_ms", () =>
      meetingSummaryText(batches[0], true, signal),
    );
    await authorize();
    signal.throwIfAborted();
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
    if (
      directory &&
      dirname(directory) === tmpdir() &&
      basename(directory).startsWith("meeting-summary-")
    )
      await rm(directory, { recursive: true, force: true });
  }
}
