"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMeetingRecording } from "../../hooks/useMeetingRecording";
import { formatElapsedTime } from "../../utils/meeting-room.utils";

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
    if (
      recording?.status === "RECORDING" &&
      announced.current !== recording.id
    ) {
      announced.current = recording.id;
      toast.info(
        "This meeting is being recorded, including shared screens and audio.",
        { duration: 8000 },
      );
    }
  }, [recording?.id, recording?.status]);
  useEffect(() => {
    if (recording?.status !== "RECORDING") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [recording?.status]);
  if (!recording) return null;
  const elapsed = recording.startedAt
    ? Math.max(
        0,
        Math.floor((now - new Date(recording.startedAt).getTime()) / 1000),
      )
    : 0;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-200"
    >
      <span className="h-2 w-2 rounded-full bg-red-500" />
      {recording.status === "RECORDING"
        ? `REC ${formatElapsedTime(elapsed)}`
        : recording.status === "STARTING"
          ? "Starting recording…"
          : "Processing recording…"}
    </span>
  );
}
