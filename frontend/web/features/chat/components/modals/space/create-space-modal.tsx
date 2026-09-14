"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createSpace } from "@/features/chat/api/space.api";
import { ChatInputModal } from "@/features/chat/components/ui/chat-input-modal";
import { Globe } from "lucide-react";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated?: (space: any) => void;
}

export default function CreateSpaceModal({
  isOpen,
  onClose,
  onSpaceCreated,
}: CreateSpaceModalProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleConfirm = async (name: string) => {
    setIsCreating(true);
    try {
      const response = await createSpace(name.trim());
      if (response && response.data) {
        toast.success("Space created successfully");
        if (onSpaceCreated) {
          onSpaceCreated(response.data);
        }
        onClose();
      } else {
        toast.error("Failed to create space");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error creating space");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ChatInputModal
      open={isOpen}
      title="Create a New Space"
      description="Spaces are team hubs where you organize channels and projects."
      placeholder="e.g. Product Engineering, Marketing Hub"
      confirmLabel="Create Space"
      cancelLabel="Cancel"
      icon={Globe}
      isLoading={isCreating}
      errorMessage="Please enter a space name"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}

