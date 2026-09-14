"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  sendMeetingRoomReaction,
  updateMeetingHandState,
} from "../api/meeting.api";
import type {
  MeetingParticipantResponse,
  MeetingRoomReactionResponse,
} from "../types/meeting.types";
import type { MeetingRoomReactionEmoji } from "../types/meeting.constants";

export function useMeetingRoomInteractions({
  joinToken,
  onHandUpdated,
  onRoomReactionSent,
}: {
  joinToken: string;
  onHandUpdated: (participant: MeetingParticipantResponse) => void;
  onRoomReactionSent: (reaction: MeetingRoomReactionResponse) => void;
}) {
  const updateHandMutation = useMutation({
    mutationFn: (raised: boolean) =>
      updateMeetingHandState(joinToken, { raised }),
    onSuccess: (response) => {
      onHandUpdated(response.data);
    },
    onError: () => {
      toast.error("Could not update hand state");
    },
  });
  const roomReactionMutation = useMutation({
    mutationFn: (emoji: MeetingRoomReactionEmoji) =>
      sendMeetingRoomReaction(joinToken, { emoji }),
    onSuccess: (response) => {
      onRoomReactionSent(response.data);
    },
    onError: () => {
      toast.error("Could not send reaction");
    },
  });

  return {
    isHandUpdatePending: updateHandMutation.isPending,
    isReactionPending: roomReactionMutation.isPending,
    toggleHand: (raised: boolean) => updateHandMutation.mutate(raised),
    sendReaction: (emoji: MeetingRoomReactionEmoji) =>
      roomReactionMutation.mutate(emoji),
  };
}
