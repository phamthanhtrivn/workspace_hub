"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import NoteMessage from "./note-message";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
interface ViewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: any;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Ghi chú</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-2 max-h-[70vh] overflow-y-auto">
          <NoteMessage
            note={note}
            onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
            onEditNote={(title, content) => {
              const socket = socketService.getSocket();
              if (socket) {
                socket.emit(ChatEvent.EDIT_NOTE, {
                  conversationId,
                  messageId: note.messageId,
                  title,
                  content,
                });
              }
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
