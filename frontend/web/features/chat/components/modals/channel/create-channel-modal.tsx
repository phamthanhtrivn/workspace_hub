"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Hash } from "lucide-react";
import { toast } from "sonner";
import { createChannel } from "@/features/chat/api/space.api";
import { useAppIntl } from "@/features/i18n/useAppIntl";

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
  const intl = useAppIntl();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(intl.formatMessage({ id: "chat.enterChannelNameError" }));
      return;
    }

    if (!spaceId) {
      toast.error(intl.formatMessage({ id: "chat.spaceInfoNotFound" }));
      return;
    }

    // Convert name to lowercase-dashed style if desired (standard channel style)
    const formattedName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

    if (!formattedName) {
      toast.error(intl.formatMessage({ id: "chat.invalidChannelName" }));
      return;
    }

    setIsCreating(true);
    try {
      const response = await createChannel(spaceId, formattedName);
      if (response && response.data) {
        toast.success(intl.formatMessage({ id: "chat.channelCreated" }));
        if (onChannelCreated) {
          onChannelCreated(response.data);
        }
        onClose();
      } else {
        toast.error(intl.formatMessage({ id: "chat.createChannelFailed" }));
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          intl.formatMessage({ id: "chat.createChannelError" }),
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {intl.formatMessage({ id: "chat.createNewChannel" })}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {intl.formatMessage({ id: "chat.channelName" })}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Hash size={16} />
              </span>
              <input
                type="text"
                placeholder={intl.formatMessage({
                  id: "chat.channelNamePlaceholder",
                })}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl text-sm outline-none transition duration-150"
                maxLength={40}
                required
              />
            </div>
            <p className="text-[11px] text-gray-400">
              {intl.formatMessage({ id: "chat.channelNameHelp" })}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              {intl.formatMessage({ id: "app.cancel" })}
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md shadow-blue-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              {isCreating && <Loader2 size={16} className="animate-spin" />}
              {intl.formatMessage({ id: "chat.createChannel" })}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
