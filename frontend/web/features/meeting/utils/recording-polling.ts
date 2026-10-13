import type { RecordingRoomStatus } from "../types/meeting-recording.types";

const RECORDING_REQUEST_COOLDOWN_MS = 60_000;

export function recordingPollInterval(
  state: RecordingRoomStatus | undefined,
  connected: boolean,
): number {
  const hasPendingRequest =
    state?.recordingRequest?.status === "PENDING" ||
    Boolean(state?.recordingRequests?.length);
  const isTransitioning = ["STARTING", "PAUSING", "PROCESSING"].includes(
    state?.recording?.status ?? "",
  );
  // Socket events drive connected clients; polling remains a recovery path.
  return hasPendingRequest || isTransitioning ? 3000 : connected ? 30_000 : 5000;
}

export function recordingRequestRefreshAt(
  state: RecordingRoomStatus | undefined,
  now: number,
): number | undefined {
  const times = [
    state?.recordingRequest,
    ...(state?.recordingRequests ?? []),
  ].flatMap((request) =>
    request?.status === "PENDING" ? [Date.parse(request.expiresAt)] : [],
  );
  if (
    state?.needsRecordingPermission &&
    !state.canRequestRecording &&
    state.recordingRequest?.status !== "PENDING"
  )
    times.push(
      Date.parse(state.recordingRequest?.requestedAt ?? "") +
        RECORDING_REQUEST_COOLDOWN_MS,
    );
  const future = times.filter((time) => Number.isFinite(time) && time > now);
  return future.length ? Math.min(...future) : undefined;
}
