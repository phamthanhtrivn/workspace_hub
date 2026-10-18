"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiCheck,
  FiMessageSquare,
  FiPaperclip,
  FiBarChart2,
  FiEdit3,
  FiCheckSquare,
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

interface ChannelSettingsModalProps {
  channel: ChannelResponse;
  onClose: () => void;
}

export default function ChannelSettingsModal({
  channel,
  onClose,
}: ChannelSettingsModalProps) {
  const [settings, setSettings] = useState({
    allowSendMessage: channel.setting?.allowSendMessage ?? true,
    allowPinMessage: channel.setting?.allowPinMessage ?? true,
    allowCreatePoll: channel.setting?.allowCreatePoll ?? true,
    allowCreateNote: channel.setting?.allowCreateNote ?? true,
    allowCreateTask: channel.setting?.allowCreateTask ?? true,
  });
  const [channelName, setChannelName] = useState(channel.name || "");

  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceId = useAppSelector((state) => state.chat.activeSpaceId);

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(channel.spaceId),
    queryFn: async () => (await getSpaceDetails(channel.spaceId)).data,
    enabled: !!channel.spaceId,
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
        const { allowCreateTask, ...otherSettings } = settings;
        await updateChannelSettings(
          channel.id,
          spaceDetail?.projectId
            ? { ...otherSettings, allowCreateTask }
            : otherSettings,
        );
      }

      if (canEditName) {
        const trimmedName = channelName.trim();
        if (trimmedName !== (channel.name || "")) {
          if (!trimmedName) {
            toast.error("Channel name is required");
            setIsSaving(false);
            return;
          }
          await updateChannelInfo(channel.id, trimmedName);
        }
      }

      toast.success("Channel settings updated successfully");
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
      onClose();
    } catch {
      toast.error("Failed to update channel settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/50 transition-all duration-200">
      <div className={`${dialogLayout.surface} bg-card rounded-dialog w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border flex flex-col max-h-[85vh]`}>
        <div className="flex items-center justify-between p-6 border-b border-border bg-card shrink-0">
          <h2 className="text-section-title font-semibold text-foreground tracking-tight">
            Channel Settings
          </h2>
          <button aria-label="Close"
            onClick={onClose}
            className="cursor-pointer p-2.5 text-muted-foreground hover:text-muted-foreground rounded-full hover:bg-muted transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className={`${dialogLayout.body} overflow-y-auto flex-1 custom-scrollbar`}>
          {/* Channel Info Section */}
          <div className="p-5 bg-background flex flex-col gap-4 border-b border-border">
            {canEditName ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    className="w-full px-4 py-2 bg-card border border-input rounded-control focus:outline-none focus:border-info-outline focus:ring-2 focus:ring-ring transition-all text-sm font-medium text-foreground"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold text-foreground text-base">
                    {channelName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Only channel creators or admins can edit channel settings.
                  </p>
                </div>
              </div>
            )}
          </div>

          {canEditSettings && (
            <div className="p-5 bg-background">
              <div className="border border-border rounded-panel overflow-hidden divide-y divide-border">
                <SettingItem
                  title="Allow Sending Messages"
                  description="Members can post messages in this channel."
                  checked={settings.allowSendMessage}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowSendMessage")}
                  icon={<FiMessageSquare size={18} />}
                />
                <SettingItem
                  title="Allow Pinning Messages"
                  description="Members can pin important messages in this channel."
                  checked={settings.allowPinMessage}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowPinMessage")}
                  icon={<FiPaperclip size={18} />}
                />
                <SettingItem
                  title="Allow Creating Polls"
                  description="Members can create voting polls in this channel."
                  checked={settings.allowCreatePoll}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowCreatePoll")}
                  icon={<FiBarChart2 size={18} />}
                />
                <SettingItem
                  title="Allow Creating Notes"
                  description="Members can create collaborative notes in this channel."
                  checked={settings.allowCreateNote}
                  disabled={!canEditSettings}
                  onChange={() => handleToggle("allowCreateNote")}
                  icon={<FiEdit3 size={18} />}
                />
                {spaceDetail?.projectId && (
                  <SettingItem
                    title="Allow Creating Tasks"
                    description="Members can create tasks in this channel."
                    checked={settings.allowCreateTask}
                    disabled={!canEditSettings}
                    onChange={() => handleToggle("allowCreateTask")}
                    icon={<FiCheckSquare size={18} />}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-5 border-t border-border gap-3 bg-background shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-foreground bg-card border border-border hover:bg-background rounded-control transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {canEditName && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary rounded-control transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <FiCheck size={18} />
                  Save Changes
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
    <div className="flex items-center justify-between p-4 bg-card hover:bg-background transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-panel bg-info-soft text-info-content flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          checked ? "bg-primary" : "bg-input"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5 bg-primary-foreground" : "translate-x-0.5 bg-card"
          }`}
        />
      </button>
    </div>
  );
}
