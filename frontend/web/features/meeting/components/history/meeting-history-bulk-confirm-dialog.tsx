"use client";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MEETING_HISTORY_BULK_LABELS } from "../../types/meeting.constants";
import type { MeetingHistoryBulkVisibilityPayload } from "../../types/meeting.types";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingHistoryBulkConfirmDialogProps {
  request: MeetingHistoryBulkVisibilityPayload | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function MeetingHistoryBulkConfirmDialog({ request, pending, onClose, onConfirm }: MeetingHistoryBulkConfirmDialogProps) {
  if (!request) return null;
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{MEETING_HISTORY_BULK_LABELS.confirmTitle(request.hidden, request.expectedCount)}</AlertDialogTitle>
          <AlertDialogDescription>
            {request.hidden ? MEETING_HISTORY_BULK_LABELS.hideDescription : MEETING_HISTORY_BULK_LABELS.restoreDescription}
            {" "}{request.scope === "all" ? MEETING_HISTORY_BULK_LABELS.allPages : MEETING_HISTORY_BULK_LABELS.selectedPage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-wrap gap-2">
          <MeetingButton type="button" tone="outline" disabled={pending} onClick={onClose}>{MEETING_HISTORY_BULK_LABELS.cancel}</MeetingButton>
          <MeetingButton type="button" loading={pending} disabled={pending || !request.expectedCount} onClick={() => void onConfirm()}>
            {request.scope === "all"
              ? request.hidden ? MEETING_HISTORY_BULK_LABELS.hideAll : MEETING_HISTORY_BULK_LABELS.restoreAll
              : request.hidden ? MEETING_HISTORY_BULK_LABELS.hideSelected : MEETING_HISTORY_BULK_LABELS.restoreSelected}
          </MeetingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
