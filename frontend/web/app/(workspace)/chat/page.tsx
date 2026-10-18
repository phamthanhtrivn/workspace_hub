import { createPageMetadata } from "@/lib/seo";
import ChatLayout from "@/features/chat/components/chat-layout";

export const metadata = createPageMetadata("/chat");

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col">
      <ChatLayout />
    </div>
  );
}
