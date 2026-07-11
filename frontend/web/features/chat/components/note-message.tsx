"use client";

import React, { useState } from "react";
import { FileText, Edit2 } from "lucide-react";
import EditNoteModal from "./edit-note-modal";
import { useAppSelector } from "@/store/store";
import { formatDividerTime } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "../api/chat.api";

interface NoteMessageProps {
  note: {
    id: string;
    title: string;
    content: string;
    createdBy: string;
    createdAt: string;
  };
  onUserClick?: (userId: string) => void;
  onEditNote?: (title: string, content: string) => void;
}

const NoteMessage = React.memo(function NoteMessage({
  note,
  onUserClick,
  onEditNote,
}: NoteMessageProps) {
  const currentUser = useAppSelector((state) => state.auth);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!note) {
    return (
      <div className="text-gray-500 italic p-4">Ghi chú không khả dụng</div>
    );
  }

  const { data: creatorProfile } = useQuery({
    queryKey: ["userProfile", note.createdBy],
    queryFn: () => getPublicProfile(note.createdBy),
    enabled: !!note.createdBy,
    staleTime: 5 * 60 * 1000,
  });

  const isMe = note.createdBy === currentUser?.userId;

  return (
    <div className="flex flex-col items-center my-4 w-full">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm max-w-md w-full relative overflow-hidden">
        {/* Decorative corner fold */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white via-amber-100 to-amber-200 rounded-bl-xl border-b border-l border-amber-200 shadow-sm" />

        <div className="flex items-start gap-3 mb-3 relative z-10">
          <div className="bg-amber-200/50 p-2 rounded-xl text-amber-700">
            <FileText size={24} />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-lg font-semibold text-amber-900 leading-tight">
              {note.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-amber-700/70 mt-1">
              <span>
                Bởi{" "}
                <span
                  className={`font-medium text-amber-800 ${!isMe ? "cursor-pointer hover:underline" : ""}`}
                  onClick={() => {
                    if (!isMe) onUserClick?.(note.createdBy);
                  }}
                >
                  {isMe
                    ? "Bạn"
                    : creatorProfile?.data?.fullName || "Người dùng"}
                </span>
              </span>
              <span>•</span>
              <span>{formatDividerTime(new Date(note.createdAt))}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-4 text-gray-800 text-sm leading-relaxed border border-amber-100 relative z-10 whitespace-pre-wrap">
          {note.content}
        </div>

        {isMe && onEditNote && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="cursor-pointer w-full mt-3 py-2 flex items-center justify-center gap-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
          >
            <Edit2 size={16} />
            Chỉnh sửa ghi chú
          </button>
        )}
      </div>

      <EditNoteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialTitle={note.title}
        initialContent={note.content}
        onSave={(title, content) => {
          onEditNote?.(title, content);
        }}
      />
    </div>
  );
});

export default NoteMessage;
