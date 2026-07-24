"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ReactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: {
    emoji: string;
    userId: string;
    user?: { name: string; avatarUrl: string };
  }[];
}

const ReactionDetailModal: React.FC<ReactionDetailModalProps> = ({
  isOpen,
  onClose,
  reactions,
}) => {
  const [activeTab, setActiveTab] = useState<string>("all");

  if (!isOpen) return null;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce(
    (acc, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr);
      return acc;
    },
    {} as Record<string, typeof reactions>,
  );

  const emojis = Object.keys(groupedReactions);
  const displayReactions =
    activeTab === "all" ? reactions : groupedReactions[activeTab] || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Cảm xúc</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("all")}
            className={`cursor-pointer px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "all" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            Tất cả {reactions.length}
          </button>
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setActiveTab(emoji)}
              className={`cursor-pointer px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${activeTab === emoji ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <span>{emoji}</span>
              <span>{groupedReactions[emoji].length}</span>
            </button>
          ))}
        </div>

        <div className="p-2 max-h-[300px] overflow-y-auto">
          {displayReactions.map((reaction, idx) => (
            <div
              key={idx}
              onClick={() => {
                onClose();
              }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    {reaction.user?.avatarUrl ? (
                      <img
                        src={reaction.user.avatarUrl}
                        alt={reaction.user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold">
                        {(reaction.user?.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 text-xs shadow-sm z-10 flex items-center justify-center min-w-[20px] min-h-[20px]">
                    {reaction.emoji}
                  </div>
                </div>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                  {reaction.user?.name || "Người dùng"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ReactionDetailModal;
