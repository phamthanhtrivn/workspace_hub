"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MeetingButton } from "../ui/meeting-form-controls";
import type { RecordingSettings } from "../../types/meeting-recording.types";

export function MeetingRecordingSettings({
  settings,
  saving,
  onClose,
  onSave,
}: {
  settings: RecordingSettings;
  saving: boolean;
  onClose: () => void;
  onSave: (settings: RecordingSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<RecordingSettings>({ ...settings, layout: "grid" });
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
