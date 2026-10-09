"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MeetingButton } from "../ui/meeting-form-controls";
import type {
  RecordingLayout,
  RecordingSettings,
} from "../../types/meeting-recording.types";

export function MeetingRecordingSettings({
  settings,
  customLayoutsAvailable,
  saving,
  onClose,
  onSave,
}: {
  settings: RecordingSettings;
  customLayoutsAvailable: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (settings: RecordingSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="p-6">
        <DialogTitle>Recording settings</DialogTitle>
        <DialogDescription>
          These settings apply to the next recording. Only the host can change
          them.
        </DialogDescription>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.autoRecord}
            disabled={saving}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                autoRecord: event.target.checked,
              }))
            }
          />
          Automatically record when the host is in the meeting
        </label>
        <p className="text-xs text-muted-foreground">
          Starts once per meeting. Stopping it manually keeps it stopped.
        </p>
        <label className="mt-4 block text-sm">
          Default recording layout
          <select
            value={draft.layout}
            disabled={saving}
            className="mt-2 block h-10 w-full rounded-md border bg-background px-3"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                layout: event.target.value as RecordingLayout,
              }))
            }
          >
            <option value="speaker">Active speaker + shared screen</option>
            <option value="grid">Gallery + shared screen</option>
            {customLayoutsAvailable && (
              <option value="screen">Shared screen only</option>
            )}
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <MeetingButton tone="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </MeetingButton>
          <MeetingButton
            disabled={saving}
            onClick={() => {
              void onSave(draft).catch(() => {});
            }}
          >
            {saving ? "Saving…" : "Save settings"}
          </MeetingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
