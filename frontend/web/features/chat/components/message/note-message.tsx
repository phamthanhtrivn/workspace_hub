"use client";

import React, { useState } from "react";
import { FileText, Edit2 } from "lucide-react";
import { useAppSelector } from "@/store/store";
import { formatDateTime } from "@/lib/date";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { NoteResponse } from "../../types/chat.types";
import { renderMessageContent } from "../../utils/message-formatter";
import EditNoteModal from "../modals/message/edit-note-modal";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface NoteMessageProps {
  note: NoteResponse;
  onUserClick?: (userId: string) => void;
  onEditNote?: (title: string, content: string) => void;
}

const NoteMessage = React.memo(function NoteMessage({
  note,
  onUserClick,
  onEditNote,
}: NoteMessageProps) {
  const intl = useAppIntl();
  const currentUser = useAppSelector((state) => state.auth);
  const memberProfiles = useChatMemberProfiles();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!note) {
    return (
      <div className="text-gray-500 italic p-4">
        {intl.formatMessage({ id: "chat.noteUnavailable" })}
      </div>
    );
  }

  const isMe = note.createdBy === currentUser?.userId;
  const creatorProfile =
    note.creatorProfile || memberProfiles?.[note.createdBy] || null;

  return (
    <div className="flex flex-col items-center my-4 w-full">
      <div className="bg-[#FFFDF5] border border-amber-200/60 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.08)] max-w-md w-full relative overflow-hidden transition-all duration-350 hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]">
        {/* Decorative corner fold */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white via-amber-100 to-amber-200 rounded-bl-2xl border-b border-l border-amber-200/50 shadow-sm" />

        <div className="flex items-start gap-3.5 mb-3.5 relative z-10">
          <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-700 border border-amber-200/30">
            <FileText size={22} />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-lg font-black text-amber-950 leading-tight">
              {note.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-amber-800/60 mt-1 font-medium">
              <span>
                {intl.formatMessage({ id: "chat.by" })}{" "}
                <span
                  className={`font-semibold text-amber-900 ${!isMe ? "cursor-pointer hover:underline" : ""}`}
                  onClick={() => {
                    if (!isMe) onUserClick?.(note.createdBy);
                  }}
                >
                  {isMe
                    ? intl.formatMessage({ id: "chat.you" })
                    : creatorProfile?.fullName ||
                      creatorProfile?.email ||
                      intl.formatMessage({ id: "app.user" })}
                </span>
              </span>
              <span>-</span>
              <span>{formatDateTime(note.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-xl p-4 text-slate-800 text-sm leading-relaxed border border-amber-100/50 relative z-10 shadow-[inset_0_2px_4px_rgba(245,158,11,0.02)]">
          {renderMessageContent(note.content, memberProfiles ?? undefined)}
        </div>

        {isMe && onEditNote && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="cursor-pointer w-full mt-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-200/80 rounded-xl transition-all duration-200"
          >
            <Edit2 size={14} />
            {intl.formatMessage({ id: "chat.editNote" })}
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
