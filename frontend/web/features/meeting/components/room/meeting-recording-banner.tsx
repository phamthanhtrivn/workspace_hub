"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMeetingRecording } from "../../hooks/useMeetingRecording";
import { formatElapsedTime } from "../../utils/meeting-room.utils";
import { recordingElapsedSeconds } from "../../utils/recording-duration";

export function MeetingRecordingBanner({
  joinToken,
  meetingId,
}: {
  joinToken: string;
  meetingId: string;
}) {
  const { query } = useMeetingRecording(joinToken, meetingId, true);
  const recording = query.data?.recording;
  const announced = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!recording) return;
    const key = `${recording.id}:${recording.status}`;
    if (announced.current === key) return;
    if (recording.status === "RECORDING")
      toast.info(
        "This meeting is being recorded, including shared screens and audio.",
        { duration: 8000 },
      );
    else if (recording.status === "PAUSED")
      toast.info("Recording is paused. Audio and video are not being saved.");
    else if (recording.stopRequestedAt)
      toast.info("Recording stopped. The video is being processed.");
    announced.current = key;
  }, [recording]);
  useEffect(() => {
    if (recording?.status !== "RECORDING") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [recording?.status]);
  if (!recording) return null;
  const elapsed = recordingElapsedSeconds(recording, now);
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold ${recording.status === "PAUSED" ? "bg-warning-soft text-warning-content" : "bg-destructive-soft text-destructive-content"}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${recording.status === "PAUSED" ? "bg-warning-content" : "bg-destructive-content"}`}
      />
      {recording.status === "RECORDING"
        ? `REC ${formatElapsedTime(elapsed)}`
        : recording.status === "STARTING"
          ? "Starting recording…"
          : recording.status === "PAUSING"
            ? "Pausing recording…"
            : recording.status === "PAUSED"
              ? `Paused ${formatElapsedTime(elapsed)}`
              : "Processing recording…"}
    </span>
  );
}
