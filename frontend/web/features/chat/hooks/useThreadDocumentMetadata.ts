"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { documentsApi } from "@/features/documents/api/documents.api";
import type { ChatMessageResponse } from "../types/chat.types";
import {
  CHAT_MESSAGE_TYPES,
  chatDocumentMetadataKey,
  METADATA_STALE_TIME,
} from "../types/document.constants";
import type { ThreadDocumentMetadata } from "../utils/thread-snippet";

export function useThreadDocumentMetadata(
  messages: ChatMessageResponse[],
  enabled: boolean,
) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const documentIds = useMemo(
    () => [
      ...new Set(
        messages
          .filter(
            (message) =>
              message.type === CHAT_MESSAGE_TYPES.DOCUMENT && !message.recalled,
          )
          .map((message) => message.content?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    [messages],
  );
  const queries = useQueries({
    queries: documentIds.map((id) => ({
      queryKey: chatDocumentMetadataKey(currentUserId, id),
      queryFn: () => documentsApi.getChatMetadata(id),
      enabled: enabled && !!currentUserId,
      staleTime: METADATA_STALE_TIME,
      retry: false,
    })),
  });

  return new Map<string, ThreadDocumentMetadata | null | undefined>(
    documentIds.map((id, index) => [
      id,
      queries[index].isError ? null : queries[index].data,
    ]),
  );
}
