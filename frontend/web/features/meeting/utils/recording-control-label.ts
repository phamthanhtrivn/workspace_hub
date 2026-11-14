import type { RecordingRoomStatus } from "../types/meeting-recording.types";

export function recordingControlLabel(
  recording: RecordingRoomStatus["recording"] | undefined,
) {
  if (!recording) return "Record";
  if (recording.stopRequestedAt) return "Processing…";
  const labels = {
    STARTING: "Starting…",
    RECORDING: "Recording",
    PAUSING: "Pausing…",
    PAUSED: "Paused",
    PROCESSING: "Processing…",
    COMPLETED: "Completed",
    FAILED: "Failed",
    DELETED: "Record",
  } as const;

  return labels[recording.status];
}
