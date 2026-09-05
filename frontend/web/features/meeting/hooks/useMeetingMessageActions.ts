"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  editMeetingMessage,
  markMeetingMessageAsRead,
  reactMeetingMessage,
  recallMeetingMessage,
  removeMeetingMessageReaction,
  sendMeetingMessage,
} from "../api/meeting.api";
import type {
  MeetingMessageMediaPayload,
  MeetingMessageResponse,
} from "../types/meeting.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
}

export function useMeetingMessageActions({
  joinToken,
  appendMessage,
}: {
  joinToken: string;
  appendMessage: (message: MeetingMessageResponse) => void;
}) {
  const intl = useAppIntl();

  const sendMessage = useCallback(
    async (content: string, medias?: MeetingMessageMediaPayload[]) => {
      try {
        const response = await sendMeetingMessage(joinToken, {
          content,
          medias,
        });
        appendMessage(response.data);
        return response.data;
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            intl.formatMessage({ id: "meeting.chat.failedSend" }),
          ),
        );
      }
    },
    [appendMessage, intl, joinToken],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        const response = await editMeetingMessage(joinToken, messageId, {
          content,
        });
        appendMessage(response.data);
        return response.data;
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            intl.formatMessage({ id: "meeting.chat.failedEdit" }),
          ),
        );
      }
    },
    [appendMessage, intl, joinToken],
  );

  const recallMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await recallMeetingMessage(joinToken, messageId);
        appendMessage(response.data);
        return response.data;
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            intl.formatMessage({ id: "meeting.chat.failedRecall" }),
          ),
        );
      }
    },
    [appendMessage, intl, joinToken],
  );

  const reactToMessage = useCallback(
    async (messageId: string, emoji: string, action: "add" | "remove") => {
      try {
        if (action === "remove") {
          await removeMeetingMessageReaction(joinToken, messageId, { emoji });
          return;
        }

        await reactMeetingMessage(joinToken, messageId, { emoji });
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            intl.formatMessage({ id: "meeting.chat.failedReact" }),
          ),
        );
      }
    },
    [intl, joinToken],
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        await markMeetingMessageAsRead(joinToken, messageId);
      } catch {
        // Read receipts are best-effort and socket events keep peers in sync.
      }
    },
    [joinToken],
  );

  return {
    sendMessage,
    editMessage,
    recallMessage,
    reactToMessage,
    markAsRead,
  };
}
