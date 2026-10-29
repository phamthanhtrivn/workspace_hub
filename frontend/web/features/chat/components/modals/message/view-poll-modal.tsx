import React, { useEffect, useState } from "react";

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
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";


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

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/50 p-4">
      <div className="relative w-full max-w-md">
        <Button variant="unstyled" aria-label="Close"
          onClick={onClose}
          className="absolute -top-10 right-0 rounded-control bg-media-surface text-media-foreground hover:bg-media-background focus-visible:outline-media-foreground p-2 transition cursor-pointer"
        >
          <X size={24} />
        </Button>
        <div className="max-h-[85vh] overflow-y-auto rounded-panel">
          <PollMessage
            poll={poll}
            onVote={(pollOptionId, selected) => voteChannelPoll(conversationId, poll.messageId, pollOptionId, selected)}
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
              return editChannelPoll(conversationId, poll.messageId, {
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
    </div>}</DialogSurface>;
}
