"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateMeetingHistoryVisibility } from "../api/meeting.api";
import { MEETING_HISTORY_LABELS } from "../types/meeting.constants";
import { meetingKeys } from "../types/meeting.query-keys";
import type { MeetingHistoryVisibilityResponse } from "../types/meeting.types";

export function useMeetingHistoryVisibility() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ meetingId, hidden }: MeetingHistoryVisibilityResponse) =>
      updateMeetingHistoryVisibility(meetingId, hidden),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingKeys.historyRoot }),
  });

  const setVisibility = async (meetingId: string, hidden: boolean) => {
    try {
      await mutation.mutateAsync({ meetingId, hidden });
      if (hidden) {
        toast.success(MEETING_HISTORY_LABELS.hiddenSuccess, {
          action: {
            label: MEETING_HISTORY_LABELS.undo,
            onClick: () => { void setVisibility(meetingId, false); },
          },
        });
      } else {
        toast.success(MEETING_HISTORY_LABELS.restoredSuccess);
      }
    } catch {
      toast.error(MEETING_HISTORY_LABELS.updateError);
    }
  };

  return { setVisibility, isPending: mutation.isPending };
}
