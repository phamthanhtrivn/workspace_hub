"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { undoMeetingHistoryBatch, updateMeetingHistoryBulkVisibility } from "../api/meeting.api";
import { MEETING_HISTORY_BULK_LABELS, MEETING_HISTORY_LABELS } from "../types/meeting.constants";
import { meetingKeys } from "../types/meeting.query-keys";
import type { MeetingHistoryBulkVisibilityPayload } from "../types/meeting.types";

type BulkMutation = { kind: "update"; payload: MeetingHistoryBulkVisibilityPayload } | { kind: "undo"; batchId: string };

export function useMeetingHistoryBulkVisibility() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (request: BulkMutation) => request.kind === "undo"
      ? undoMeetingHistoryBatch(request.batchId)
      : updateMeetingHistoryBulkVisibility(request.payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: meetingKeys.historyRoot }),
  });

  const apply = async (request: BulkMutation): Promise<boolean> => {
    try {
      const response = await mutation.mutateAsync(request);
      const { hidden, affectedCount, batchId } = response.data;
      toast.success(affectedCount ? MEETING_HISTORY_BULK_LABELS.success(hidden, affectedCount) : MEETING_HISTORY_BULK_LABELS.noChanges, {
        ...(hidden && batchId ? { action: {
          label: MEETING_HISTORY_LABELS.undo,
          onClick: () => { void apply({ kind: "undo", batchId }); },
        } } : {}),
      });
      return true;
    } catch {
      toast.error(MEETING_HISTORY_BULK_LABELS.updateError);
      return false;
    }
  };

  return { updateBulk: (payload: MeetingHistoryBulkVisibilityPayload) => apply({ kind: "update", payload }), isPending: mutation.isPending };
}
