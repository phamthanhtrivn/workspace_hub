"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "./chat-sidebar";
import ChatArea from "./chat-area";
import ChatRightPanel from "./chat-right-panel";
import { useAppSelector } from "@/store/store";
import { MessageCircle } from "lucide-react";
import { socketService } from "../api/chat-socket.service";
import UserProfileModal from "./user-profile-modal";

export default function ChatLayout() {
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const activeConversationId = useAppSelector(
    (state) => state.chat.activeConversation?.id,
  );
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (activeConversationId) {
      setMobileView("chat");
    }
  }, [activeConversationId]);

  // Connect to communication service websocket when entering chat
  useEffect(() => {
    if (accessToken) {
      socketService.connect(accessToken);
    }
    return () => {
      socketService.disconnect();
    };
  }, [accessToken]);

  const toggleRightPanel = () => {
    setShowRightPanel((prev) => !prev);
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
        className={`flex-1 h-full min-h-0 z-10 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] relative ${mobileView === "chat" ? "flex" : "hidden md:flex"} flex-col bg-gray-50`}
      >
        {activeConversationId ? (
          <ChatArea
            onToggleRightPanel={toggleRightPanel}
            onBack={() => setMobileView("sidebar")}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <MessageCircle size={48} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Chào mừng đến với WorkspaceHub Chat
            </h2>
            <p className="text-gray-500 max-w-md text-center mb-6">
              Chọn một cuộc trò chuyện từ danh sách hoặc tìm kiếm bạn bè để bắt
              đầu nhắn tin.
            </p>
          </div>
        )}
      </div>

      {/* Right Panel - Togglable (Only show if active chat) */}
      {showRightPanel && activeConversationId && (
        <div className="absolute inset-y-0 right-0 z-30 w-full md:w-80 md:static flex-shrink-0 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)]">
          <ChatRightPanel onClose={() => setShowRightPanel(false)} />
        </div>
      )}
      <UserProfileModal />
    </div>
  );
}
