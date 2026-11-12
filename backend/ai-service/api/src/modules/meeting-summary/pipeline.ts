import { mkdtemp, rm } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { prepareMeetingAudio, AUDIO_CHUNK_SECONDS } from "./media";
import { recognizeMeetingChunk } from "./speech.client";
import {
  meetingSummaryText,
  meetingSummaryCacheKey,
  transcriptBatches,
  type TranscriptChunk,
} from "./summary";
import type { MeetingSource } from "./source";
import { MEETING_LIMITS } from "./limits";

export type MeetingSummaryState = {
  actor_id: string;
  revision: string;
  transcript: TranscriptChunk[];
  transcript_complete: boolean;
  partials: { hash: string; text: string }[];
};

export interface MeetingPipeline {
  state: MeetingSummaryState;
  signal: AbortSignal;
  authorize: () => Promise<MeetingSource>;
  checkpoint: (stage: "TRANSCRIBING" | "SUMMARIZING") => Promise<void>;
  measure: <T>(stage: string, run: () => Promise<T>) => Promise<T>;
}

export async function transcribeMeeting(
  source: MeetingSource,
  context: MeetingPipeline,
) {
  const { state, signal, authorize, checkpoint, measure } = context;
  if (state.transcript_complete) return;
  const directory = await mkdtemp(join(tmpdir(), "meeting-summary-"));
  try {
    const files = await measure("audio_ms", () =>
      prepareMeetingAudio(source, directory, signal),
    );
    const completed = new Set(
      state.transcript.map((chunk) => chunk.startSeconds / AUDIO_CHUNK_SECONDS),
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
    for (const index of pending) {
      await authorize();
      const text = await measure("speech_ms", () =>
        recognizeMeetingChunk(files[index], signal),
      );
      signal.throwIfAborted();
      state.transcript.push({
        startSeconds: index * AUDIO_CHUNK_SECONDS,
        text,
      });
      state.transcript.sort((a, b) => a.startSeconds - b.startSeconds);
      await checkpoint("TRANSCRIBING");
    }
    state.transcript_complete = true;
    await checkpoint("TRANSCRIBING");
  } finally {
    if (
      dirname(directory) === tmpdir() &&
      basename(directory).startsWith("meeting-summary-")
    )
      await rm(directory, { recursive: true, force: true });
  }
}

export async function summarizeMeeting(context: MeetingPipeline) {
  const { state, signal, authorize, checkpoint, measure } = context;
  let batches = transcriptBatches(state.transcript);
  if (!batches.length) throw new Error("No speech recognized");
  await checkpoint("SUMMARIZING");
  // Each level shrinks the input; checkpoint completed model outputs for explicit retries.
  for (let level = 0; batches.length > 1; level++) {
    if (level >= MEETING_LIMITS.reductionLevels)
      throw new Error("Meeting summary reduction limit");
    const notes: string[] = [];
    for (const batch of batches) {
      const hash = meetingSummaryCacheKey(batch);
      let saved = state.partials.find((item) => item.hash === hash);
      if (!saved) {
        await authorize();
        const text = await measure("model_ms", () =>
          meetingSummaryText(batch, false, signal),
        );
        if (text.length > MEETING_LIMITS.noteCharacters)
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
      if (group.length + note.length + 2 > MEETING_LIMITS.batchCharacters) {
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

  return content;
}
