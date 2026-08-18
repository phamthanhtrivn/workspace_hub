import ChannelChatHeader from "./header/channel-chat-header";
import DirectConversationHeader from "./header/direct-conversation-header";
import { useActiveChat } from "../hooks/useChatQueries";
import { ChatContextType } from "../types/chat.types";

interface ChatHeaderProps {
  onToggleRightPanel: () => void;
  onOpenSearch?: () => void;
  onBack?: () => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const { activeChatType } = useActiveChat();

  if (activeChatType === ChatContextType.DIRECT_MESSAGE) {
    return <DirectConversationHeader {...props} />;
  }

  return <ChannelChatHeader {...props} />;
}
