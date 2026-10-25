import { mkdtemp, rm } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { rows } from "../infrastructure/database/database";
import { meetingSource } from "../modules/meeting-summary/source";
import {
  prepareMeetingAudio,
  AUDIO_CHUNK_SECONDS,
} from "../modules/meeting-summary/media";
import { recognizeMeetingChunk } from "../modules/meeting-summary/speech.client";
import {
  meetingSummaryText,
  transcriptBatches,
  type TranscriptChunk,
} from "../modules/meeting-summary/summary";

type SummaryRow = {
  actor_id: string;
  revision: string;
  transcript: TranscriptChunk[];
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
    signal.throwIfAborted();
    const result = await rows(
      `UPDATE notebook_ai.meeting_summaries SET stage=$3,transcript=$4::jsonb,
      partials=$5::jsonb,updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING' RETURNING recording_id`,
      [
        recordingId,
        runId,
        stage,
        JSON.stringify(state.transcript),
        JSON.stringify(state.partials),
      ],
    );
    if (!result.length) throw new Error("Meeting summary run superseded");
  };
  try {
    const source = await authorize();
    directory = await mkdtemp(join(tmpdir(), "meeting-summary-"));
    const files = await prepareMeetingAudio(source, directory, signal);
    if (state.transcript.length > files.length)
      throw new Error("Invalid transcript checkpoint");
    await checkpoint("TRANSCRIBING");
    for (let index = state.transcript.length; index < files.length; index++) {
      await authorize();
      const text = await recognizeMeetingChunk(files[index], signal);
      state.transcript.push({
        startSeconds: index * AUDIO_CHUNK_SECONDS,
        text,
      });
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
        const hash = createHash("sha256").update(batch).digest("hex");
        let saved = state.partials.find((item) => item.hash === hash);
        if (!saved) {
          await authorize();
          const text = await meetingSummaryText(batch, false, signal);
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
    const content = await meetingSummaryText(batches[0], true, signal);
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
