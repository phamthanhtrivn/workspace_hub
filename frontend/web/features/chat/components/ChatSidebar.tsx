"use client";

import React, { useState } from "react";
import { Search, Plus, UserPlus, Users, MessageSquare } from "lucide-react";
import SearchUserModal from "./SearchUserModal";
interface ChatSidebarProps {
  onSelectChat?: () => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "groups">(
    "all",
  );
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Đoạn chat</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition cursor-pointer"
              title="Tìm kiếm bạn bè"
            >
              <UserPlus size={18} />
            </button>
            <button className="p-2 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-600 transition">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search messages or users..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 py-2 gap-4 border-b border-gray-100 bg-white">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 pb-2 px-1 border-b-2 text-sm font-medium transition ${activeTab === "all" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <MessageSquare size={16} /> Tất cả
        </button>
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex items-center gap-1.5 pb-2 px-1 border-b-2 text-sm font-medium transition ${activeTab === "personal" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <UserPlus size={16} /> Cá nhân
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex items-center gap-1.5 pb-2 px-1 border-b-2 text-sm font-medium transition ${activeTab === "groups" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Users size={16} /> Nhóm
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 bg-white">
        {(activeTab === "all" || activeTab === "groups") && (
          <div className="space-y-1">
            {/* Mock Chat Item */}
            <div
              className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition"
              onClick={onSelectChat}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                  T
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-sm text-gray-800 truncate">
                    Team Project
                  </h3>
                  <span className="text-xs text-gray-500">10:42 AM</span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  Can we review the new design?
                </p>
              </div>
            </div>
          </div>
        )}

        {(activeTab === "all" || activeTab === "personal") && (
          <div className="space-y-1 mt-1">
            {/* Mock Chat Item 2 */}
            <div
              className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition bg-blue-50/50"
              onClick={onSelectChat}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg">
                  A
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full"></div>
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-sm text-gray-800 truncate">
                    Alice Smith
                  </h3>
                  <span className="text-xs text-blue-600 font-medium">
                    Yesterday
                  </span>
                </div>
                <p className="text-sm text-gray-800 font-medium truncate">
                  Sounds good!
                </p>
              </div>
              <div className="ml-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                2
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SearchUserModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}
