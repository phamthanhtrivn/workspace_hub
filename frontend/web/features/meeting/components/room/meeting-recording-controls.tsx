"use client";

import { useState } from "react";
import { Circle, Square, Pause, Play, Settings, Hand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/store/store";
import { useMeetingRecording } from "../../hooks/useMeetingRecording";
import type { RecordingLayout } from "../../types/meeting-recording.types";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingRecordingSettings } from "./meeting-recording-settings";
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
    configure,
    requestPermission,
    answerPermissionRequest,
  } = useMeetingRecording(joinToken, meetingId);
  const userId = useAppSelector((state) => state.auth.userId);
  const [dialog, setDialog] = useState<"start" | "stop" | null>(null);
  const [layout, setLayout] = useState<RecordingLayout>("speaker");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const state = query.data;
  const active = Boolean(state?.recording);
  const canStop = state?.capabilities.canStop;
  const needsPermission = state?.needsRecordingPermission;
  const requesting = state?.recordingRequest?.status === "PENDING";
  const disabled =
    query.isLoading ||
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

  const submit = () => {
    if (dialog === "start") start.mutate({ layout, key: crypto.randomUUID() });
    else if (state?.recording)
      stop.mutate({ id: state.recording.id, key: crypto.randomUUID() });
    setDialog(null);
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
          onClick={() => {
            if (needsPermission) {
              requestPermission.mutate();
              return;
            }
            setLayout(state?.settings?.layout ?? "speaker");
            setDialog(active ? "stop" : "start");
          }}
        />
      </span>
      {state && (
        <MeetingRecordingRequests
          state={state}
          saving={answerPermissionRequest.isPending}
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
      {state?.capabilities.canGrantRecord && (
        <MeetingRoomControlButton
          label="Rec. setup"
          ariaLabel="Recording settings"
          icon={Settings}
          disabled={configure.isPending}
          onClick={() => setSettingsOpen(true)}
        />
      )}
      {settingsOpen && state && (
        <MeetingRecordingSettings
          settings={state.settings ?? { autoRecord: false, layout: "speaker" }}
          customLayoutsAvailable={state.customLayoutsAvailable}
          saving={configure.isPending}
          onClose={() => setSettingsOpen(false)}
          onSave={async (settings) => {
            await configure.mutateAsync(settings);
            setSettingsOpen(false);
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
              : `${layout === "screen" ? "The shared screen and meeting audio will be recorded." : "Only participant cameras and microphones will be recorded. Shared screens and desktop audio are excluded."} Everyone will be notified. ${state?.ownerId === userId ? "You own the recording and can share it afterwards." : "The meeting creator owns the recording and can give you access afterwards."}`}
          </DialogDescription>
          {dialog === "start" && (
            <label className="mt-4 block text-sm">
              Recording layout
              <select
                value={layout}
                onChange={(event) =>
                  setLayout(event.target.value as RecordingLayout)
                }
                className="mt-2 block h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="speaker">Active speaker (cameras only)</option>
                <option value="grid">Gallery (cameras only)</option>
                {state?.customLayoutsAvailable && (
                  <option value="screen">Shared screen only</option>
                )}
              </select>
            </label>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <MeetingButton tone="secondary" onClick={() => setDialog(null)}>
              Cancel
            </MeetingButton>
            <MeetingButton
              tone={dialog === "stop" ? "danger" : "primary"}
              onClick={submit}
            >
              {dialog === "stop" ? "Stop recording" : "Start recording"}
            </MeetingButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
