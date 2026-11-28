import type { RecordingRoomStatus } from "../types/meeting-recording.types";

export function recordingElapsedSeconds(
  recording: NonNullable<RecordingRoomStatus["recording"]>,
  now: number,
) {
  const saved = recording.recordedSeconds ?? 0;
  const start =
    recording.segmentStartedAt ?? (saved === 0 ? recording.startedAt : null);
  if (recording.status !== "RECORDING" || !start) return saved;
  const elapsed = Math.floor((now - new Date(start).getTime()) / 1000);
  return saved + (Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0);
}
