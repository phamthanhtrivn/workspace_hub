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
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";


function getMessageConversationId(
  message: Partial<ChatMessageResponse> | null | undefined,
) {
  return (
    message?.chatId ?? message?.channelId ?? message?.conversationId ?? null
  );
}

export default function ThreadSidePanel() {
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
    <div className="w-full h-full min-h-0 min-w-0 bg-card border-l border-border flex flex-col">
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-foreground">
          Thread Discussion
        </h2>
        <Button variant="unstyled" aria-label="Close"
          onClick={handleClose}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <X size={20} />
        </Button>
      </div>
      <LoadingState label="Loading thread..." layout="centered" className="flex-1 min-h-0 flex items-center justify-center text-xs font-medium text-muted-foreground" />
    </div>
  );
}
