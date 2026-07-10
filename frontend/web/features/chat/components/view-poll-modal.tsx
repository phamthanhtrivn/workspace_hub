import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import PollMessage from "./poll-message";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";

interface ViewPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: any;
  conversationId: string;
}

export default function ViewPollModal({
  isOpen,
  onClose,
  poll,
  conversationId,
}: ViewPollModalProps) {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !poll || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2 transition cursor-pointer"
        >
          <X size={24} />
        </button>
        <div className="max-h-[85vh] overflow-y-auto no-scrollbar rounded-2xl">
          <PollMessage
            poll={poll}
            onVote={(pollOptionId) => {
              const socket = socketService.getSocket();
              if (socket) {
                socket.emit(ChatEvent.VOTE_POLL, {
                  conversationId,
                  messageId: poll.messageId,
                  pollOptionId,
                });
              }
            }}
            onAddOption={(text) => {
              const socket = socketService.getSocket();
              if (socket) {
                socket.emit(ChatEvent.ADD_POLL_OPTION, {
                  conversationId,
                  messageId: poll.messageId,
                  text,
                });
              }
            }}
            onEditPoll={(
              title,
              multipleChoice,
              allowAddOptions,
              anonymous,
              isLocked,
            ) => {
              const socket = socketService.getSocket();
              if (socket) {
                socket.emit(ChatEvent.EDIT_POLL, {
                  conversationId,
                  messageId: poll.messageId,
                  title,
                  multipleChoice,
                  allowAddOptions,
                  anonymous,
                  isLocked,
                });
              }
            }}
            onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
