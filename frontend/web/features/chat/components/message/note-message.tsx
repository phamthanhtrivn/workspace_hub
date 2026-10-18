"use client";

import React, { useState } from "react";
import { FileText, Edit2 } from "lucide-react";
import { useAppSelector } from "@/store/store";
import { formatDateTime } from "@/lib/date";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { NoteResponse } from "../../types/chat.types";
import { renderMessageContent } from "../../utils/message-formatter";
import EditNoteModal from "../modals/message/edit-note-modal";
import { Button } from "@/components/ui/button";

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
  const currentUser = useAppSelector((state) => state.auth);
  const memberProfiles = useChatMemberProfiles();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!note) {
    return (
      <div className="text-muted-foreground italic p-4">
        Note unavailable
      </div>
    );
  }

  const isMe = note.createdBy === currentUser?.userId;
  const creatorProfile =
    note.creatorProfile || memberProfiles?.[note.createdBy] || null;

  return (
    <div className="flex flex-col items-center my-4 w-full">
      <div className="bg-warning-soft border border-border rounded-panel p-5 max-w-md min-w-0 w-full [overflow-wrap:anywhere] relative overflow-hidden transition-all duration-200">
        {/* Decorative corner fold */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-card rounded-bl-2xl border-b border-l border-border" />

        <div className="flex items-start gap-3.5 mb-3.5 relative z-10">
          <div className="bg-warning p-2.5 rounded-panel text-warning-foreground border border-warning-outline">
            <FileText size={22} />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-section-title font-semibold text-warning-content leading-tight">
              {note.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-warning-content mt-1 font-medium">
              <span>
                by{" "}
                <span
                  className={`font-semibold text-warning-content ${!isMe ? "cursor-pointer hover:underline" : ""}`}
                  onClick={() => {
                    if (!isMe) onUserClick?.(note.createdBy);
                  }}
                >
                  {isMe
                    ? "you"
                    : creatorProfile?.fullName ||
                      creatorProfile?.email ||
                      "User"}
                </span>
              </span>
              <span>-</span>
              <span>{formatDateTime(note.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-panel p-4 text-foreground text-sm leading-relaxed border border-border relative z-10">
          {renderMessageContent(note.content, memberProfiles ?? undefined)}
        </div>

        {isMe && onEditNote && (
          <Button variant="unstyled"
            onClick={() => setIsEditModalOpen(true)}
            className="cursor-pointer w-full mt-4 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-warning-content bg-warning-soft hover:bg-warning-soft/90 rounded-control transition-all duration-200"
          >
            <Edit2 size={14} />
            Edit Note
          </Button>
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
