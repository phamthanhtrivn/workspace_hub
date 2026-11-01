"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import ChatSidebar from "./sidebar/chat-sidebar";
import ChatArea from "./chat-area/chat-area";
import ChatRightPanel from "./right-panel/chat-right-panel";
import ThreadSidePanel from "./right-panel/thread/thread-side-panel";
import { useAppDispatch, useAppSelector } from "@/store/store";
import ChatWelcomeCarousel from "./welcome/chat-welcome-carousel";
import UserProfileModal from "./modals/shared/user-profile-modal";
import {
  setActiveChat,
  setActiveSpaceId,
  setActiveThreadRootMessage,
} from "@/store/chat/chat-slice";
import { SheetPanel } from "@/components/ui/sheet";
import { useElementMinWidth } from "@/components/ui/use-element-min-width";
import { ChatContextType } from "../types/chat.types";

export default function ChatLayout() {
  const urlParams = useSearchParams();
  const urlSpaceId = urlParams.get("spaceId");
  const urlChannelId = urlParams.get("channelId");
  const urlThreadId = urlParams.get("threadId");
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wideCanvas = useElementMinWidth(canvasRef, 1060);
  const dispatch = useAppDispatch();
  const [showRightPanel, setShowRightPanel] = useState(Boolean(urlSpaceId && urlChannelId && urlThreadId));
  const [rightPanelTab, setRightPanelTab] = useState<"search" | null>(null);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">((urlSpaceId && urlChannelId) || activeChatId ? "chat" : "sidebar");
  const activeThreadRootMessageId = useAppSelector(
    (state) => state.chat.activeThreadRootMessageId,
  );

  useEffect(() => {
    const spaceId = urlSpaceId, channelId = urlChannelId, threadId = urlThreadId;
    if (!spaceId || !channelId) return;

    dispatch(setActiveSpaceId(spaceId));
    dispatch(
      setActiveChat({
        chatId: channelId,
        chatType: ChatContextType.CHANNEL,
      }),
    );
    if (threadId) {
      dispatch(
        setActiveThreadRootMessage({
          id: threadId,
          channelId,
          content: "",
          type: "TEXT",
          senderId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }, [dispatch, urlSpaceId, urlChannelId, urlThreadId]);

  const [previousChatId, setPreviousChatId] = useState(activeChatId);
  if (previousChatId !== activeChatId) {
    setPreviousChatId(activeChatId);
    if (activeChatId) setMobileView("chat");
  }

  const toggleRightPanel = () => {
    setShowRightPanel((prev) => !prev);
    if (!showRightPanel) {
      setRightPanelTab(null);
    }
  };

  const handleOpenSearch = () => {
    setRightPanelTab("search");
    setShowRightPanel(true);
  };

  const handleSelectChat = () => {
    setMobileView("chat");
  };

  return (
    <div ref={canvasRef} className="@container/messages relative flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-card">
      {/* Sidebar */}
      <div
        className={`z-20 min-h-0 w-full shrink-0 @min-[720px]/messages:w-80 ${mobileView === "sidebar" || !activeChatId ? "block" : "hidden @min-[720px]/messages:block"}`}
      >
        <ChatSidebar onSelectChat={handleSelectChat} />
      </div>

      {/* Main Chat Area or Empty State */}
      <div
        className={`flex-1 min-w-0 h-full min-h-0 z-10 relative ${mobileView === "chat" && activeChatId ? "flex" : "hidden @min-[720px]/messages:flex"} flex-col bg-background`}
      >
        {activeChatId ? (
          <ChatArea
            onToggleRightPanel={toggleRightPanel}
            onOpenSearch={handleOpenSearch}
            onBack={() => setMobileView("sidebar")}
          />
        ) : (
          <ChatWelcomeCarousel />
        )}
      </div>

      {/* Thread Panel - separate from conversation info */}
      {activeThreadRootMessageId && activeChatId && (
        <SheetPanel open modal={!wideCanvas} aria-label="Thread discussion" onClose={() => dispatch(setActiveThreadRootMessage(null))} className="absolute inset-y-0 right-0 z-30 min-h-0 min-w-0 w-full shrink-0 bg-card shadow-panel @min-[720px]/messages:w-[340px] @min-[1060px]/messages:static">
          <ThreadSidePanel />
        </SheetPanel>
      )}

      {/* Right Panel - Togglable (Only show if active chat and no thread) */}
      {showRightPanel && activeChatId && !activeThreadRootMessageId && (
        <SheetPanel open modal={!wideCanvas} aria-label="Conversation details" onClose={() => setShowRightPanel(false)} className="absolute inset-y-0 right-0 z-30 min-h-0 min-w-0 w-full shrink-0 bg-card shadow-panel @min-[720px]/messages:w-[340px] @min-[1060px]/messages:static">
          <ChatRightPanel
            onClose={() => {
              setShowRightPanel(false);
            }}
            initialDetailView={rightPanelTab}
          />
        </SheetPanel>
      )}
      <UserProfileModal />
    </div>
  );
}
