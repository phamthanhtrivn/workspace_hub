import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { rows } from "../infrastructure/database/database";
import { prepareAudioChunks } from "../modules/meeting-summary/media";
import { recognizeMeetingChunk } from "../modules/meeting-summary/speech.client";
import { voiceSource } from "../modules/voice-transcript/voice-source";
import {
  VOICE_TRANSCRIPT,
  type VoiceTranscriptState,
} from "../modules/voice-transcript/voice.constants";
import { pcmWaveSeconds } from "../modules/voice-transcript/wave-duration";
import { pollUntilAborted } from "../common/abort-polling";
import { isRetryableVoiceFailure } from "../modules/voice-transcript/voice-transcript-retry";

export async function processVoiceTranscript(runId: string, attemptsRemaining = 0) {
  const [state] = await rows<VoiceTranscriptState>(
    `UPDATE notebook_ai.voice_transcripts SET status='RUNNING',updated_at=now() WHERE run_id=$1 AND status='QUEUED' RETURNING *`,
    [runId],
  );
  if (!state) return;
  const controller = new AbortController();
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(VOICE_TRANSCRIPT.timeoutMs),
  ]);
  const authorize = async () => {
    signal.throwIfAborted();
    const source = await voiceSource(
      state.media_id,
      state.actor_id,
      state.chat_type,
      signal,
    );
    if (source.revision !== state.revision)
      throw new Error("Voice message changed");
    return source;
  };
  const stopPolling = pollUntilAborted(
    controller,
    VOICE_TRANSCRIPT.accessIntervalMs,
    authorize,
  );
  let directory: string | undefined;
  try {
    const source = await authorize();
    directory = await mkdtemp(join(tmpdir(), "voice-transcript-"));
    const files = await prepareAudioChunks(source, directory, signal, {
      maxBytes: VOICE_TRANSCRIPT.maxBytes,
      maxSeconds: VOICE_TRANSCRIPT.maxSeconds,
    });
    let duration = 0;
    for (const file of files) duration += pcmWaveSeconds(await readFile(file));
    if (duration > VOICE_TRANSCRIPT.maxSeconds + 0.25)
      throw new Error(VOICE_TRANSCRIPT.tooLong);
    for (let index = 0; index < files.length; index++) {
      if (state.chunks.some((chunk) => chunk.index === index)) continue;
      await authorize();
      const text = await recognizeMeetingChunk(files[index], signal, "auto");
      state.chunks.push({ index, text });
      if (
        state.chunks.reduce((size, chunk) => size + chunk.text.length, 0) >
        VOICE_TRANSCRIPT.maxText
      )
        throw new Error("Voice transcript exceeds limit");
      const saved = await rows(
        `UPDATE notebook_ai.voice_transcripts SET chunks=$2::jsonb,updated_at=now() WHERE run_id=$1 AND status='RUNNING' RETURNING run_id`,
        [runId, JSON.stringify(state.chunks)],
      );
      if (!saved.length) throw new Error("Voice transcript run superseded");
    }
    await authorize();
    const text = state.chunks
      .sort((a, b) => a.index - b.index)
      .map((chunk) => chunk.text)
      .filter(Boolean)
      .join(" ")
      .trim();
    await rows(
      `UPDATE notebook_ai.voice_transcripts SET status='COMPLETED',text=$2,error=NULL,updated_at=now() WHERE run_id=$1 AND status='RUNNING'`,
      [runId, text],
    );
  } catch (error) {
    if (attemptsRemaining > 0 && isRetryableVoiceFailure(error)) {
      const retried = await rows(
        `UPDATE notebook_ai.voice_transcripts SET status='QUEUED',error=NULL,updated_at=now()
         WHERE run_id=$1 AND status='RUNNING' RETURNING run_id`,
        [runId],
      );
      if (retried.length) throw new Error(VOICE_TRANSCRIPT.failed);
      return;
    }
    const message =
      error instanceof Error && error.message === VOICE_TRANSCRIPT.tooLong
        ? VOICE_TRANSCRIPT.tooLong
        : VOICE_TRANSCRIPT.failed;
    await rows(
      `UPDATE notebook_ai.voice_transcripts SET status='FAILED',error=$2,updated_at=now() WHERE run_id=$1 AND status='RUNNING'`,
      [runId, message],
    );
  } finally {
    stopPolling();
    controller.abort();
    if (
      directory &&
      dirname(directory) === tmpdir() &&
      basename(directory).startsWith("voice-transcript-")
    )
      await rm(directory, { recursive: true, force: true });
  }
}
