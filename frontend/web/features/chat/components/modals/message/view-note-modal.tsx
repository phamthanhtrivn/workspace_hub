"use client";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React from "react";

import { X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { NoteResponse } from "@/features/chat/types/chat.types";
import NoteMessage from "../../message/note-message";
import { editChannelNote } from "@/features/chat/api/chat.api";
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";


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
  const mounted = useHydrated();
  const dispatch = useAppDispatch();


  if (!isOpen || !mounted || !note) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Note Details
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={20} />
          </Button>
        </div>
        <div className={`${dialogLayout.body} p-2 max-h-[70vh] overflow-y-auto`}>
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
    </div>}</DialogSurface>;
}

