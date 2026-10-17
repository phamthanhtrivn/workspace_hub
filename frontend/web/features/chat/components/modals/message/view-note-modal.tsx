"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { NoteResponse } from "@/features/chat/types/chat.types";
import NoteMessage from "../../message/note-message";
import { editChannelNote } from "@/features/chat/api/chat.api";

interface ViewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: NoteResponse | null;
  conversationId: string;
}

export default function ViewNoteModal({
  isOpen,
  onClose,
  note,
  conversationId,
}: ViewNoteModalProps) {
  const [mounted, setMounted] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !note) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/50 p-4">
      <div className="bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Note Details
          </h2>
          <button aria-label="Close"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-2 max-h-[70vh] overflow-y-auto">
          <NoteMessage
            note={note}
            onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
            onEditNote={(title, content) => {
              void editChannelNote(conversationId, note.messageId, {
                  title,
                  content,
                });
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

