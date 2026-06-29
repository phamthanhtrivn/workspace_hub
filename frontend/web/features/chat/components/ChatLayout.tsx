"use client";

import React, { useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import ChatRightPanel from "./ChatRightPanel";

export default function ChatLayout() {
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  const toggleRightPanel = () => {
    setShowRightPanel((prev) => !prev);
  };

  const handleSelectChat = () => {
    setMobileView('chat');
  };

  return (
    <div className="flex h-full w-full bg-white overflow-hidden border-gray-200 shadow-sm sm:rounded-2xl sm:border relative">
      {/* Sidebar */}
      <div className={`flex-shrink-0 z-20 w-full md:w-80 ${mobileView === 'sidebar' ? 'block' : 'hidden md:block'}`}>
        <ChatSidebar onSelectChat={handleSelectChat} />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 min-w-0 z-10 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] relative ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
        <ChatArea 
          onToggleRightPanel={toggleRightPanel} 
          onBack={() => setMobileView('sidebar')} 
        />
      </div>

      {/* Right Panel - Togglable */}
      {showRightPanel && (
        <div className="absolute inset-y-0 right-0 z-30 w-full md:w-80 md:static flex-shrink-0 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)]">
          <ChatRightPanel onClose={() => setShowRightPanel(false)} />
        </div>
      )}
    </div>
  );
}
