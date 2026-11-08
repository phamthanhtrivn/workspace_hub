"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import {
  createVoiceTranscript,
  getVoiceTranscript,
} from "../../api/voice-transcript.api";
import { VOICE } from "../../constants/voice.constants";
import type { VoiceChatType } from "../../types/voice.types";

export function useVoiceTranscript(mediaId: string, chatType?: VoiceChatType) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [requested, setRequested] = useState(false);
  const queryKey = ["voice-transcript", userId, chatType, mediaId];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getVoiceTranscript(mediaId, chatType!, signal),
    enabled: !!userId && !!chatType && requested && expanded,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (current) =>
      !current.state.error &&
      ["QUEUED", "RUNNING"].includes(current.state.data?.status ?? "")
        ? VOICE.pollMs
        : false,
  });
  const create = useMutation({
    mutationFn: () => createVoiceTranscript(mediaId, chatType!),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      setRequested(true);
    },
  });
  const busy =
    create.isPending ||
    (expanded &&
      requested &&
      !query.isError &&
      ["QUEUED", "RUNNING"].includes(query.data?.status ?? ""));
  const failed =
    create.isError || query.isError || query.data?.status === "FAILED";
  const toggle = () => {
    if (!chatType || !userId || create.isPending) return;
    if (expanded && !failed) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (
      !failed &&
      ["QUEUED", "RUNNING", "COMPLETED"].includes(query.data?.status ?? "")
    )
      setRequested(true);
    else create.mutate();
  };
  return {
    expanded,
    toggle,
    busy,
    creating: create.isPending,
    failed,
    data: query.data,
    error: create.error || query.error,
    enabled: Boolean(chatType && userId),
  };
}
