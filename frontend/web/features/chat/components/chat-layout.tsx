"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "./sidebar/chat-sidebar";
import ChatArea from "./chat-area/chat-area";
import ChatRightPanel from "./right-panel/chat-right-panel";
import ThreadSidePanel from "./right-panel/thread/thread-side-panel";
import { useAppSelector } from "@/store/store";
import { MessageCircle } from "lucide-react";
import UserProfileModal from "./modals/shared/user-profile-modal";
import { useChatSocket } from "../hooks/socket/useChatSocket";

export default function ChatLayout() {
  useChatSocket();
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"search" | null>(null);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const activeThreadRootMessageId = useAppSelector(
    (state) => state.chat.activeThreadRootMessageId,
  );

  useEffect(() => {
    if (activeChatId) {
      setMobileView("chat");
    }
  }, [activeChatId]);

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
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 z-20 w-full md:w-80 ${mobileView === "sidebar" ? "block" : "hidden md:block"}`}
      >
        <ChatSidebar onSelectChat={handleSelectChat} />
      </div>

      {/* Main Chat Area or Empty State */}
      <div
        className={`flex-1 min-w-0 h-full min-h-0 z-10 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] relative ${mobileView === "chat" ? "flex" : "hidden md:flex"} flex-col bg-gray-50`}
      >
        {activeChatId ? (
          <ChatArea
            onToggleRightPanel={toggleRightPanel}
            onOpenSearch={handleOpenSearch}
            onBack={() => setMobileView("sidebar")}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <MessageCircle size={48} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to WorkspaceHub Chat
            </h2>
            <p className="text-gray-500 max-w-md text-center mb-6">
              Select a channel or direct message to start messaging.
            </p>
          </div>
        )}
      </div>

      {/* Thread Panel - separate from conversation info */}
      {activeThreadRootMessageId && activeChatId && (
        <div className="absolute inset-y-0 right-0 z-30 w-full md:w-[340px] md:static flex-shrink-0 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)]">
          <ThreadSidePanel />
        </div>
      )}

      {/* Right Panel - Togglable (Only show if active chat and no thread) */}
      {showRightPanel && activeChatId && !activeThreadRootMessageId && (
        <div className="absolute inset-y-0 right-0 z-30 w-full md:w-[340px] md:static flex-shrink-0 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)]">
          <ChatRightPanel
            onClose={() => {
              setShowRightPanel(false);
            }}
            initialDetailView={rightPanelTab}
          />
        </div>
      )}
      <UserProfileModal />
    </div>
  );
}
