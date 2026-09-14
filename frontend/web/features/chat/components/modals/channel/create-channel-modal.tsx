"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createChannel } from "@/features/chat/api/space.api";
import { ChatInputModal } from "@/features/chat/components/ui/chat-input-modal";
import { Hash } from "lucide-react";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onChannelCreated?: (channel: any) => void;
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  spaceId,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleConfirm = async (name: string) => {
    if (!spaceId) {
      toast.error("Space information missing");
      return;
    }

    const formattedName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

    if (!formattedName) {
      toast.error("Please enter a valid channel name");
      return;
    }

    setIsCreating(true);
    try {
      const response = await createChannel(spaceId, formattedName);
      if (response && response.data) {
        toast.success("Channel created successfully");
        if (onChannelCreated) {
          onChannelCreated(response.data);
        }
        onClose();
      } else {
        toast.error("Failed to create channel");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error creating channel");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ChatInputModal
      open={isOpen}
      title="Create a New Channel"
      description="Channels are where your team communicates about specific topics."
      placeholder="e.g. project-updates, announcements"
      confirmLabel="Create Channel"
      cancelLabel="Cancel"
      icon={Hash}
      isLoading={isCreating}
      errorMessage="Please enter a channel name"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}

