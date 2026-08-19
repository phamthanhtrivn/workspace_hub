"use client";

import { ChatContextType } from "../../types/chat.types";
import { useActiveChat } from "../../hooks/useChatQueries";
import DirectMessageRightPanel from "./direct-message/direct-message-right-panel";
import ChannelRightPanel from "./channel/channel-right-panel";

interface ChatRightPanelProps {
  onClose: () => void;
  initialDetailView?: "files" | "polls" | "search" | "threads" | null;
}

export default function ChatRightPanel(props: ChatRightPanelProps) {
  const { activeChatType } = useActiveChat();
  const isDirect = activeChatType === ChatContextType.DIRECT_MESSAGE;

  if (isDirect) {
    return <DirectMessageRightPanel {...props} />;
  }
  return <ChannelRightPanel {...props} />;
}
