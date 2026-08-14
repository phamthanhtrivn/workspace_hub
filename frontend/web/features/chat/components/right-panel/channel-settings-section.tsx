import React from "react";
import {
  CheckCircle2,
  MessageSquare,
  Pin,
  Settings,
  StickyNote,
  BarChart2,
  XCircle,
} from "lucide-react";
import { ChannelResponse } from "../../types/chat.types";
import { cn } from "@/lib/utils";

interface ChannelSettingsSectionProps {
  activeChannel: ChannelResponse;
  currentUserId: string | null;
  onOpenSettings: () => void;
}

const permissionItems = [
  {
    key: "allowSendMessage",
    label: "Send messages",
    icon: MessageSquare,
  },
  {
    key: "allowPinMessage",
    label: "Pin messages",
    icon: Pin,
  },
  {
    key: "allowCreatePoll",
    label: "Create polls",
    icon: BarChart2,
  },
  {
    key: "allowCreateNote",
    label: "Create notes",
    icon: StickyNote,
  },
] as const;

export default function ChannelSettingsSection({
  activeChannel,
  currentUserId,
  onOpenSettings,
}: ChannelSettingsSectionProps) {
  const currentMember = activeChannel.members?.find(
    (member) => member.userId === currentUserId,
  );
  const isAdmin = currentMember?.role === "ADMIN";
  
  return (
    isAdmin && (
      <div>
        <button
          type="button"
          onClick={isAdmin ? onOpenSettings : undefined}
          className={cn(
            "w-full px-4 py-3 flex items-center justify-between transition",
            isAdmin ? "cursor-pointer hover:bg-gray-50" : "cursor-default",
          )}
        >
          <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
            <Settings size={18} className="text-gray-500" />
            Channel Settings
          </div>
        </button>
        <div className="h-px bg-gray-100 mx-4 my-1" />
      </div>
    )
  );
}
