"use client";

import React from "react";
import { FileText } from "lucide-react";
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
}

const NoteMessage = React.memo(function NoteMessage({ note, onUserClick }: NoteMessageProps) {
  const currentUser = useAppSelector((state) => state.auth);

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
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 shadow-sm max-w-md w-full relative overflow-hidden">
        {/* Decorative corner fold */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white via-yellow-100 to-yellow-200 rounded-bl-xl border-b border-l border-yellow-200 shadow-sm" />

        <div className="flex items-start gap-3 mb-3 relative z-10">
          <div className="bg-yellow-200/50 p-2 rounded-xl text-yellow-700">
            <FileText size={24} />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-lg font-semibold text-yellow-900 leading-tight">
              {note.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-yellow-700/70 mt-1">
              <span>
                Bởi{" "}
                <span
                  className="font-medium cursor-pointer hover:underline text-yellow-800"
                  onClick={() => onUserClick?.(note.createdBy)}
                >
                  {isMe ? "Bạn" : creatorProfile?.data?.fullName || "Người dùng"}
                </span>
              </span>
              <span>•</span>
              <span>{formatDividerTime(new Date(note.createdAt))}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-4 text-gray-800 text-sm leading-relaxed border border-yellow-100 relative z-10 whitespace-pre-wrap">
          {note.content}
        </div>
      </div>
    </div>
  );
});

export default NoteMessage;
