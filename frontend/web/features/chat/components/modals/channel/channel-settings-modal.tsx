"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiCheck,
  FiMessageSquare,
  FiPaperclip,
  FiBarChart2,
  FiEdit3,
} from "react-icons/fi";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { ChannelResponse } from "@/features/chat/types/chat.types";
import { getSpaceDetails } from "@/features/chat/api/space.api";
import { chatKeys } from "@/features/chat/types/chat.constant";
import {
  updateChannelInfo,
  updateChannelSettings,
} from "@/features/chat/api/channel.api";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ChannelSettingsModalProps {
  channel: ChannelResponse;
  onClose: () => void;
}

export default function ChannelSettingsModal({
  channel,
  onClose,
}: ChannelSettingsModalProps) {
  const intl = useAppIntl();
  const [settings, setSettings] = useState({
    allowSendMessage: channel.setting?.allowSendMessage ?? true,
    allowPinMessage: channel.setting?.allowPinMessage ?? true,
    allowCreatePoll: channel.setting?.allowCreatePoll ?? true,
    allowCreateNote: channel.setting?.allowCreateNote ?? true,
  });
  const [channelName, setChannelName] = useState(channel.name || "");

  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceId = useAppSelector((state) => state.chat.activeSpaceId);

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(activeSpaceId || ""),
    queryFn: async () => (await getSpaceDetails(activeSpaceId!)).data,
    enabled: !!activeSpaceId,
  });

  const spaceCreatorId = spaceDetail?.createdBy;
  const isOwner = spaceCreatorId === currentUserId;
  const isChannelCreator = channel.createdBy === currentUserId;

  const currentMember = channel.members?.find(
    (member) => member.userId === currentUserId,
  );
  const isSpaceAdmin = currentMember?.role === "ADMIN";
  const canEditName = isSpaceAdmin || isChannelCreator || isOwner;
  const canEditSettings = isSpaceAdmin || isOwner;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (canEditSettings) {
        await updateChannelSettings(channel.id, settings);
      }

      if (canEditName) {
        const trimmedName = channelName.trim();
        if (trimmedName !== (channel.name || "")) {
          if (!trimmedName) {
            toast.error(intl.formatMessage({ id: "chat.channelNameRequired" }));
            setIsSaving(false);
            return;
          }
          await updateChannelInfo(channel.id, trimmedName);
        }
      }

      toast.success(intl.formatMessage({ id: "chat.settingsUpdated" }));
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
      onClose();
    } catch {
      toast.error(intl.formatMessage({ id: "chat.updateChannelSettingsFailed" }));
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white shrink-0">
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
            {intl.formatMessage({ id: "chat.channelSettings" })}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-2.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Channel Info Section */}
          <div className="p-5 bg-gray-50/50 flex flex-col gap-4 border-b border-gray-100">
            {canEditName ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    {intl.formatMessage({ id: "chat.channelName" })}
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "chat.enterChannelName",
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium text-gray-800"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-base">
                    {channelName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {intl.formatMessage({ id: "chat.channelSettingsOwnerOnly" })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {canEditSettings && (
            <div className="p-5 bg-gray-50/50">
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
                <SettingItem
                  title={intl.formatMessage({
                    id: "chat.allowSendingMessages",
                  })}
                  description={intl.formatMessage({
                    id: "chat.allowSendingMessagesDescription",
                  })}
                  checked={settings.allowSendMessage}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowSendMessage")}
                  icon={<FiMessageSquare size={18} />}
                />
                <SettingItem
                  title={intl.formatMessage({
                    id: "chat.allowPinningMessages",
                  })}
                  description={intl.formatMessage({
                    id: "chat.allowPinningMessagesDescription",
                  })}
                  checked={settings.allowPinMessage}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowPinMessage")}
                  icon={<FiPaperclip size={18} />}
                />
                <SettingItem
                  title={intl.formatMessage({ id: "chat.allowCreatingPolls" })}
                  description={intl.formatMessage({
                    id: "chat.allowCreatingPollsDescription",
                  })}
                  checked={settings.allowCreatePoll}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowCreatePoll")}
                  icon={<FiBarChart2 size={18} />}
                />
                <SettingItem
                  title={intl.formatMessage({ id: "chat.allowCreatingNotes" })}
                  description={intl.formatMessage({
                    id: "chat.allowCreatingNotesDescription",
                  })}
                  checked={settings.allowCreateNote}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowCreateNote")}
                  icon={<FiEdit3 size={18} />}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-5 border-t border-gray-100 gap-3 bg-gray-50/80 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          {canEditName && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
            >
              {isSaving ? (
                intl.formatMessage({ id: "app.saving" })
              ) : (
                <>
                  <FiCheck size={18} />
                  {intl.formatMessage({ id: "app.saveChanges" })}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SettingItem({
  title,
  description,
  checked,
  disabled = false,
  onChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
