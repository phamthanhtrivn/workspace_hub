"use client";

import React from "react";
import {
  Globe,
  Hash,
  Lock,
  MessageSquareText,
  PanelLeftOpen,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { UserAvatar } from "@/components/common/user-avatar";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";
import type {
  ChannelResponse,
  ConversationResponse,
  SpaceResponse,
} from "../../types/chat.types";
import { isPrivateChannel } from "../../utils/channel-membership-permissions";

type DirectConversationListItem = ConversationResponse & {
  unreadCount?: number;
};

interface ChatSidebarRailProps {
  activeSpace: SpaceResponse | null;
  activeChatId?: string;
  currentUserId: string | null;
  channels: ChannelResponse[];
  directMessages: DirectConversationListItem[];
  followedThreadsUnreadCount: number;
  onExpand: () => void;
  onOpenSearch: () => void;
  onOpenThreads: () => void;
  onSelectChannel: (channel: ChannelResponse) => void;
  onSelectConversation: (conversation: ConversationResponse) => void;
  onCreateDirectConversation: () => void;
}

function getSpaceInitials(name?: string | null): string {
  if (!name) return "SP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SP";

  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const ChatSidebarRail = React.memo(function ChatSidebarRail({
  activeSpace,
  activeChatId,
  currentUserId,
  channels,
  directMessages,
  followedThreadsUnreadCount,
  onExpand,
  onOpenSearch,
  onOpenThreads,
  onSelectChannel,
  onSelectConversation,
  onCreateDirectConversation,
}: ChatSidebarRailProps) {
  const spaceInitials = getSpaceInitials(activeSpace?.name);

  return (
    <div className="hidden h-full w-full flex-col items-center justify-between bg-sidebar py-3 @min-[720px]/messages:flex">
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2">
        <IconButton
          label="Expand Messages sidebar"
          showTooltip={false}
          size="icon-sm"
          onClick={onExpand}
          title="Expand Messages sidebar"
          className="size-9 shrink-0 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PanelLeftOpen className="size-4" aria-hidden="true" />
        </IconButton>

        <Button
          type="button"
          variant="unstyled"
          onClick={onExpand}
          title={activeSpace?.name ?? "Select Space"}
          aria-label={activeSpace?.name ?? "Select Space"}
          className="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {spaceInitials}
        </Button>

        <div className="relative shrink-0">
          <IconButton
            label="Threads"
            showTooltip={false}
            size="icon-sm"
            onClick={onOpenThreads}
            title="Threads"
            className="size-9 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageSquareText className="size-4" aria-hidden="true" />
          </IconButton>
          {followedThreadsUnreadCount > 0 && (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-sidebar tabular-nums">
              {followedThreadsUnreadCount > MAX_UNREAD_COUNT
                ? "99+"
                : followedThreadsUnreadCount}
            </span>
          )}
        </div>

        <IconButton
          label="Search channels and conversations"
          showTooltip={false}
          size="icon-sm"
          onClick={onOpenSearch}
          title="Search channels and conversations"
          className="size-9 shrink-0 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Search className="size-4" aria-hidden="true" />
        </IconButton>

        <div className="my-0.5 h-px w-6 shrink-0 bg-border" />

        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-1.5 py-0.5">
          {channels.map((channel) => {
            const isSelected = activeChatId === channel.id;
            const unread = channel.unreadCount ?? 0;

            return (
              <div key={channel.id} className="relative shrink-0">
                <IconButton
                  label={`#${channel.name}`}
                  showTooltip={false}
                  size="icon-sm"
                  onClick={() => onSelectChannel(channel)}
                  title={`#${channel.name}`}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "size-9 rounded-control transition-all",
                    isSelected
                      ? "bg-primary-soft text-primary-soft-foreground ring-2 ring-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {channel.isDefault ? (
                    <Globe className="size-4" aria-hidden="true" />
                  ) : isPrivateChannel(channel) ? (
                    <Lock className="size-4" aria-hidden="true" />
                  ) : (
                    <Hash className="size-4" aria-hidden="true" />
                  )}
                </IconButton>
                {unread > 0 && !isSelected && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-sidebar tabular-nums">
                    {unread > MAX_UNREAD_COUNT ? "99+" : unread}
                  </span>
                )}
              </div>
            );
          })}

          {channels.length > 0 && directMessages.length > 0 && (
            <div className="my-0.5 h-px w-6 shrink-0 bg-border" />
          )}

          {directMessages.map((conversation) => {
            const isSelected = activeChatId === conversation.id;
            const unread = conversation.unreadCount ?? 0;
            const otherMember = conversation.members?.find(
              (member) => member.userId !== currentUserId,
            );
            const name = otherMember?.profile?.fullName || "User";

            return (
              <div key={conversation.id} className="relative shrink-0">
                <Button
                  type="button"
                  variant="unstyled"
                  onClick={() => onSelectConversation(conversation)}
                  title={name}
                  aria-label={name}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all",
                    isSelected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
                      : "opacity-90 hover:opacity-100",
                  )}
                >
                  <UserAvatar
                    src={otherMember?.profile?.avatarUrl}
                    alt={name}
                    width={32}
                    height={32}
                    className="size-8 rounded-full border border-border object-cover"
                  />
                </Button>
                {unread > 0 && !isSelected && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-sidebar tabular-nums">
                    {unread > MAX_UNREAD_COUNT ? "99+" : unread}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <IconButton
        label="New direct message"
        showTooltip={false}
        size="icon-sm"
        onClick={onCreateDirectConversation}
        title="New direct message"
        className="mt-2 size-8 shrink-0 rounded-control border border-border bg-card text-foreground hover:bg-muted"
      >
        <Plus className="size-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
});
