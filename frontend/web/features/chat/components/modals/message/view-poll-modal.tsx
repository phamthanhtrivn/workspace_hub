import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { PollResponse } from "@/features/chat/types/chat.types";
import PollMessage from "../../message/poll-message";
import {
  addChannelPollOption,
  editChannelPoll,
  voteChannelPoll,
} from "@/features/chat/api/chat.api";

interface ViewPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll?: PollResponse | null;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/50 p-4">
      <div className="relative w-full max-w-md">
        <button aria-label="Close"
          onClick={onClose}
          className="absolute -top-10 right-0 rounded-control bg-media-surface text-media-foreground hover:bg-media-background focus-visible:outline-media-foreground p-2 transition cursor-pointer"
        >
          <X size={24} />
        </button>
        <div className="max-h-[85vh] overflow-y-auto no-scrollbar rounded-panel">
          <PollMessage
            poll={poll}
            onVote={(pollOptionId) => {
              void voteChannelPoll(conversationId, poll.messageId, pollOptionId);
            }}
            onAddOption={(text) => {
              void addChannelPollOption(conversationId, poll.messageId, text);
            }}
            onEditPoll={(
              title,
              multipleChoice,
              allowAddOptions,
              anonymous,
              isLocked,
            ) => {
              void editChannelPoll(conversationId, poll.messageId, {
                  title,
                  multipleChoice,
                  allowAddOptions,
                  anonymous,
                  isLocked,
                });
            }}
            onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
