"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Hand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { RecordingRoomStatus } from "../../types/meeting-recording.types";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";

export function MeetingRecordingRequests({
  state,
  saving,
  pendingAnswer,
  onAnswer,
}: {
  state: RecordingRoomStatus;
  saving: boolean;
  pendingAnswer?: { id: string; approve: boolean };
  onAnswer: (id: string, approve: boolean) => void;
}) {
  const [deferredId, setDeferredId] = useState<string>();
  const previous = useRef<{ id: string; status: string } | null>(null);
  const own = state.recordingRequest;
  useEffect(() => {
    if (!own) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    previous.current = { id: own.id, status: own.status };
    if (before?.id !== own.id || before.status !== "PENDING") return;
    if (own.status === "APPROVED")
      toast.success("The host approved recording. You can now press Record.");
    else if (own.status === "REJECTED")
      toast.info("The host declined your recording request.");
    else if (own.status === "EXPIRED")
      toast.info("Your recording request expired. You can request again.");
  }, [own]);
  const requests = state.capabilities.canGrantRecord
    ? (state.recordingRequests ?? [])
    : [];
  const request = requests[0];
  if (!request) return null;
  return (
    <>
      <MeetingRoomControlButton
        label={`Requests (${requests.length})`}
        ariaLabel={`Recording permission requests (${requests.length})`}
        icon={Hand}
        onClick={() => setDeferredId(undefined)}
      />
      <Dialog
        open={request.id !== deferredId}
        onOpenChange={(open) => {
          if (!open) setDeferredId(request.id);
        }}
      >
        <DialogContent
          className="p-6"
          aria-labelledby="recording-request-title"
        >
          <DialogTitle id="recording-request-title">
            Recording permission request
          </DialogTitle>
          <DialogDescription className="mt-3">
            {request.displayName || "A participant"} wants permission to record
            this meeting. Approving lets them press Record; it does not start
            recording automatically.
          </DialogDescription>
          {requests.length > 1 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {requests.length - 1} more request(s) waiting.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <MeetingButton
              tone="secondary"
              disabled={saving}
              onClick={() => setDeferredId(request.id)}
            >
              Later
            </MeetingButton>
            <MeetingButton
              tone="outline"
              loading={saving && pendingAnswer?.id === request.id && !pendingAnswer.approve}
              disabled={saving}
              onClick={() => onAnswer(request.id, false)}
            >
              Decline
            </MeetingButton>
            <MeetingButton
              disabled={saving}
              loading={saving && pendingAnswer?.id === request.id && pendingAnswer.approve}
              onClick={() => onAnswer(request.id, true)}
            >
              Allow recording
            </MeetingButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
