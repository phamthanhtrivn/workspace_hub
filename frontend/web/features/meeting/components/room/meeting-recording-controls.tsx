"use client";

import { useState } from "react";
import { Circle, Square } from "lucide-react";
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

export function MeetingRecordingControls({
  joinToken,
  meetingId,
}: {
  joinToken: string;
  meetingId: string;
}) {
  const { query, start, stop } = useMeetingRecording(joinToken, meetingId);
  const userId = useAppSelector((state) => state.auth.userId);
  const [dialog, setDialog] = useState<"start" | "stop" | null>(null);
  const [layout, setLayout] = useState<RecordingLayout>("speaker");
  const state = query.data;
  const active = Boolean(state?.recording);
  const canStop = state?.capabilities.canStop;
  const disabled =
    query.isLoading ||
    query.isError ||
    start.isPending ||
    stop.isPending ||
    !(active ? canStop : state?.capabilities.canStart);
  const label = state?.recording?.stopRequestedAt
    ? "Processing"
    : active
      ? "Stop recording"
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
          icon={active ? Square : Circle}
          active={active}
          disabled={disabled}
          onClick={() => setDialog(active ? "stop" : "start")}
        />
      </span>
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
              : `Camera, shared screens and meeting audio will be recorded. Everyone will be notified. ${state?.ownerId === userId ? "You own the recording and can share it afterwards." : "The meeting creator owns the recording and can give you access afterwards."}`}
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
                <option value="speaker">Active speaker + shared screen</option>
                <option value="grid">Gallery + shared screen</option>
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
