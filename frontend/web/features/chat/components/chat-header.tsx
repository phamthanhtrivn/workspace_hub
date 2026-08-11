import ChannelConversationHeader from "./header/channel-conversation-header";
import DirectConversationHeader from "./header/direct-conversation-header";
import { useAppSelector } from "@/store/store";

interface ChatHeaderProps {
  onToggleRightPanel: () => void;
  onOpenSearch?: () => void;
  onBack?: () => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const { activeConversation } = useAppSelector((state) => state.chat);

  if (activeConversation?.type === "DIRECT") {
    return <DirectConversationHeader {...props} />;
  }

  return <ChannelConversationHeader {...props} />;
}
