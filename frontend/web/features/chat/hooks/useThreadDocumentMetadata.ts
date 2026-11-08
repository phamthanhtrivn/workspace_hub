"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { documentsApi } from "@/features/documents/api/documents.api";
import type { ChatMessageResponse } from "../types/chat.types";
import {
  CHAT_MESSAGE_TYPES,
  METADATA_QUERY_KEY,
  METADATA_STALE_TIME,
} from "../types/document.constants";
import type { ThreadDocumentMetadata } from "../utils/thread-snippet";

export function useThreadDocumentMetadata(
  messages: ChatMessageResponse[],
  enabled: boolean,
) {
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
      queryKey: [METADATA_QUERY_KEY, id],
      queryFn: () => documentsApi.getChatMetadata(id),
      enabled,
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
