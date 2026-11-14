import { isAxiosError } from "axios";
import type { RecordingStatus } from "../types/meeting-recording.types";

const RECORDING_FAILURE_MESSAGES = {
  START_UNCONFIRMED:
    "Recording did not start successfully. Check the recording service and start a new recording.",
  START_CANCELLED:
    "Recording startup was cancelled. No completed video was created.",
  RECORDING_CAPTURE_LOST:
    "The meeting tab capture ended before recording started. Choose the meeting tab and try again.",
  RECORDING_UNAVAILABLE:
    "The recording service was unavailable. Try starting a new recording when it is ready.",
  EGRESS_FAILED:
    "The recording service could not finish capturing the meeting. Please try a new recording.",
  EGRESS_NOT_FOUND:
    "The recording session could not be found. Please start a new recording.",
  PROCESSING_TIMEOUT:
    "The recording could not finish processing in time. Contact the meeting administrator.",
  RECORDING_OUTPUT_INVALID:
    "The recording output could not be verified. Contact the meeting administrator.",
  RECORDING_MERGE_FAILED:
    "The recorded segments could not be combined. Contact the meeting administrator to recover the video.",
  UPLOAD_RECOVERY_FAILED:
    "The video upload could not be recovered. Contact the meeting administrator.",
  UPLOAD_BACKUP_REQUIRES_RECOVERY:
    "Upload failed. Contact the meeting administrator to recover the saved video.",
  UPLOAD_RECOVERY_PENDING: "Recovering the video upload…",
  MERGE_PENDING: "Combining recorded segments…",
  VERIFYING_UPLOAD: "Verifying the video upload…",
} as const;

export function recordingFailureMessage(code: string, status: RecordingStatus) {
  return (
    RECORDING_FAILURE_MESSAGES[
      code as keyof typeof RECORDING_FAILURE_MESSAGES
    ] ??
    (status === "FAILED"
      ? "Recording could not be completed."
      : "Processing the recording…")
  );
}

export function recordingErrorMessage(error: unknown) {
  return isAxiosError<{ message?: string }>(error)
    ? (error.response?.data.message ?? "Could not update recording")
    : "Could not update recording";
}

export function recordingErrorIsPermanent(error: unknown) {
  return (
    isAxiosError(error) &&
    [400, 401, 403, 404].includes(error.response?.status ?? 0)
  );
}
