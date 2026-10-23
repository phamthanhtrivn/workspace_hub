"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Circle, Square, Pause, Play, Hand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/store/store";
import { useMeetingRecording } from "../../hooks/useMeetingRecording";
import { useMeetingTabCapture } from "../../hooks/useMeetingTabCapture";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingRecordingRequests } from "./meeting-recording-requests";

export function MeetingRecordingControls({
  joinToken,
  meetingId,
}: {
  joinToken: string;
  meetingId: string;
}) {
  const {
    query,
    start,
    stop,
    pause,
    resume,
    requestPermission,
    answerPermissionRequest,
  } = useMeetingRecording(joinToken, meetingId);
  const userId = useAppSelector((state) => state.auth.userId);
  const [dialog, setDialog] = useState<"start" | "stop" | null>(null);
  const state = query.data;
  const active = Boolean(state?.recording);
  const [capturing, setCapturing] = useState(false);
  const { capture, release } = useMeetingTabCapture(joinToken, () => {
    if (state?.recording && !state.recording.stopRequestedAt)
      stop.mutate({ id: state.recording.id, key: crypto.randomUUID() });
  });
  useEffect(() => {
    if (!active) void release();
  }, [active, release]);
  const canStop = state?.capabilities.canStop;
  const needsPermission = state?.needsRecordingPermission;
  const requesting = state?.recordingRequest?.status === "PENDING";
  const disabled =
    query.isLoading ||
    capturing ||
    query.isError ||
    start.isPending ||
    stop.isPending ||
    pause.isPending ||
    resume.isPending ||
    (needsPermission
      ? requestPermission.isPending ||
        !state?.canRequestRecording ||
        !state?.recordingAvailable
      : !(active ? canStop : state?.capabilities.canStart));
  const label = needsPermission
    ? requesting
      ? "Request pending"
      : "Ask to record"
    : state?.recording?.stopRequestedAt
      ? "Processing"
      : active
        ? "Stop"
        : "Record";

  const submit = async () => {
    if (dialog === "start") {
      setCapturing(true);
      try {
        const captureTrackSid = await capture();
        await start.mutateAsync({ layout: "grid", captureTrackSid, key: crypto.randomUUID() });
        setDialog(null);
      } catch (error) {
        await release();
        if (error instanceof Error)
          toast.error(error.name === "NotAllowedError"
            ? "Tab recording was cancelled. Choose this Meeting tab to start."
            : error.message);
      } finally { setCapturing(false); }
    } else if (state?.recording) {
      stop.mutate({ id: state.recording.id, key: crypto.randomUUID() });
      setDialog(null);
    }
  };

  return (
    <>
      <span
        title={
          state?.unavailableReason ??
          (disabled ? "Recording permission is required" : undefined)
        }
      >
        <MeetingRoomControlButton
          label={label}
          ariaLabel={
            active && !state?.recording?.stopRequestedAt && !needsPermission
              ? "Stop recording"
              : label
          }
          icon={needsPermission ? Hand : active ? Square : Circle}
          active={active && !needsPermission}
          disabled={disabled}
          loading={capturing || start.isPending || stop.isPending || requestPermission.isPending}
          onClick={() => {
            if (needsPermission) {
              requestPermission.mutate();
              return;
            }
            setDialog(active ? "stop" : "start");
          }}
        />
      </span>
      {state && (
        <MeetingRecordingRequests
          state={state}
          saving={answerPermissionRequest.isPending}
          pendingAnswer={answerPermissionRequest.variables}
          onAnswer={(id, approve) =>
            answerPermissionRequest.mutate({ id, approve })
          }
        />
      )}
      {active && state?.pauseAvailable && (
        <MeetingRoomControlButton
          label={
            state.recording?.status === "PAUSED"
              ? "Resume"
              : state.recording?.status === "PAUSING"
                ? "Pausing…"
                : "Pause"
          }
          icon={state.recording?.status === "PAUSED" ? Play : Pause}
          loading={pause.isPending || resume.isPending}
          disabled={
            pause.isPending ||
            resume.isPending ||
            !(state.capabilities.canPause || state.capabilities.canResume)
          }
          onClick={() => {
            if (!state.recording) return;
            const command = {
              id: state.recording.id,
              key: crypto.randomUUID(),
            };
            if (state.capabilities.canResume) resume.mutate(command);
            else pause.mutate(command);
          }}
        />
      )}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent
          className="p-6"
          aria-labelledby="recording-confirm-title"
        >
          <DialogTitle id="recording-confirm-title">
            {dialog === "stop" ? "Stop recording?" : "Record this meeting?"}
          </DialogTitle>
          <DialogDescription className="mt-3">
            {dialog === "stop"
              ? "The recording will be processed and saved. The meeting will continue."
              : `Choose this Meeting tab in the browser picker. The full application view, including shared content and open panels, will be recorded with meeting audio. Everyone will be notified. ${state?.ownerId === userId ? "You own the recording and can share it afterwards." : "The meeting creator owns the recording and can give you access afterwards."}`}
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <MeetingButton tone="secondary" onClick={() => setDialog(null)}>
              Cancel
            </MeetingButton>
            <MeetingButton loading={capturing || start.isPending || stop.isPending}
              tone={dialog === "stop" ? "danger" : "primary"}
              onClick={submit}
              disabled={capturing || start.isPending || stop.isPending}
            >
              {dialog === "stop" ? "Stop recording" : "Start recording"}
            </MeetingButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
