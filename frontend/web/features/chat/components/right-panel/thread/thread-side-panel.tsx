"use client";

import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setActiveThreadRootMessage } from "@/store/chat/chat-slice";
import {
  ChatContextType,
  ChatMessageResponse,
} from "../../../types/chat.types";
import {
  useActiveChat,
  useActiveThreadRootMessage,
} from "../../../hooks/useChatQueries";
import ThreadDetailView from "./thread-detail-view";
import { useAppIntl } from "@/features/i18n/useAppIntl";

function getMessageConversationId(
  message: Partial<ChatMessageResponse> | null | undefined,
) {
  return (
    message?.chatId ?? message?.channelId ?? message?.conversationId ?? null
  );
}

export default function ThreadSidePanel() {
  const intl = useAppIntl();
  const dispatch = useAppDispatch();
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const { activeChatType } = useActiveChat();
  const activeThreadRootMessage = useActiveThreadRootMessage();

  const handleClose = () => {
    dispatch(setActiveThreadRootMessage(null));
  };

  if (
    activeThreadRootMessage &&
    getMessageConversationId(activeThreadRootMessage) === activeChatId
  ) {
    return (
      <ThreadDetailView
        rootMessage={activeThreadRootMessage}
        isDirect={activeChatType === ChatContextType.DIRECT_MESSAGE}
        onBack={handleClose}
      />
    );
  }

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-gray-800">
          {intl.formatMessage({ id: "chat.threadDiscussion" })}
        </h2>
        <button
          onClick={handleClose}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center text-xs font-medium text-gray-400">
        {intl.formatMessage({ id: "chat.loadingThread" })}
      </div>
    </div>
  );
}
