"use client";

import React, { useState } from "react";
import {
  X,
  Bell,
  BellOff,
  Users,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  BarChart2,
  LogOut,
  ChevronDown,
  ChevronRight,
  User,
} from "lucide-react";
import Image from "next/image";
import { useAppSelector } from "@/store/store";

interface ChatRightPanelProps {
  onClose: () => void;
}

export default function ChatRightPanel({ onClose }: ChatRightPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "members",
  );
  const memberProfile = useAppSelector(
    (state) => state.chat.memberProfile,
  );

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Details</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Info Area */}
        <div className="p-6 flex flex-col items-center border-b border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-bold text-3xl mb-3 shadow-sm overflow-hidden">
            {memberProfile?.avatarUrl ? (
              <Image
                src={memberProfile.avatarUrl}
                alt="Avatar"
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <User size={40} className="text-gray-400" />
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-lg">
            {memberProfile?.fullName || "Người dùng ẩn danh"}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {memberProfile?.email || "Group • 4 members"}
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 transition"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
              </div>
              <span className="text-xs font-medium">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </button>
          </div>
        </div>

        {/* Accordions */}
        <div className="py-2">
          {/* Members Section */}
          <div>
            <button
              onClick={() => toggleSection("members")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
                <Users size={18} className="text-gray-500" />
                Members (4)
              </div>
              {expandedSection === "members" ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>

            {expandedSection === "members" && (
              <div className="px-4 pb-2 space-y-2">
                {["You", "Alice", "Bob", "Charlie"].map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs">
                      {name[0]}
                    </div>
                    <span className="text-sm text-gray-700">{name}</span>
                    {i === 0 && (
                      <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                ))}
                <button className="flex items-center gap-3 p-2 text-blue-600 hover:bg-blue-50 rounded-lg w-full transition mt-1">
                  <div className="w-8 h-8 rounded-full border border-dashed border-blue-400 flex items-center justify-center">
                    <Users size={14} />
                  </div>
                  <span className="text-sm font-medium">Add members</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-4 my-1"></div>

          {/* Media & Files Section */}
          <div>
            <button
              onClick={() => toggleSection("media")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
                <ImageIcon size={18} className="text-gray-500" />
                Media, Links & Docs
              </div>
              {expandedSection === "media" ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>

            {expandedSection === "media" && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 font-medium text-xs">
                    +5
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-4 my-1"></div>

          {/* Polls Section */}
          <div>
            <button
              onClick={() => toggleSection("polls")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
                <BarChart2 size={18} className="text-gray-500" />
                Polls
              </div>
              {expandedSection === "polls" ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
            {expandedSection === "polls" && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    What time works best?
                  </p>
                  <p className="text-xs text-gray-500">Active • 2 votes</p>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-4 my-1"></div>

          {/* Notes Section */}
          <div>
            <button
              onClick={() => toggleSection("notes")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
                <FileText size={18} className="text-gray-500" />
                Notes
              </div>
              {expandedSection === "notes" ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
            {expandedSection === "notes" && (
              <div className="px-4 pb-4 text-center text-sm text-gray-500 py-4">
                No notes yet
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-4 my-1"></div>

          {/* Tasks Section */}
          <div>
            <button
              onClick={() => toggleSection("tasks")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
                <CheckSquare size={18} className="text-gray-500" />
                Tasks
              </div>
              {expandedSection === "tasks" ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100">
        <button className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium text-sm">
          <LogOut size={16} />
          Leave Group
        </button>
      </div>
    </div>
  );
}
