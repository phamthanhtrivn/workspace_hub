"use client";

import {
  ChannelMemberListItem,
  SpaceRole,
} from "@/features/chat/types/chat.types";
import { User } from "lucide-react";
import { FaKey } from "react-icons/fa";

interface ChannelMemberRowProps {
  member: ChannelMemberListItem;
  onOpenProfile: (userId: string) => void;
  spaceCreatorId?: string | null;
}

function getDisplayName(member: ChannelMemberListItem, fallback: string) {
  return (
    member.nickname ||
    member.profile?.fullName ||
    member.profile?.email ||
    fallback
  );
}

function getInitial(member: ChannelMemberListItem, fallback: string) {
  return getDisplayName(member, fallback).charAt(0).toUpperCase();
}

export default function ChannelMemberRow({
  member,
  onOpenProfile,
  spaceCreatorId,
}: ChannelMemberRowProps) {
  const unknownUser = "Unknown User";
  const displayName = getDisplayName(member, unknownUser);
  const isAdmin = member.role === SpaceRole.ADMIN;
  const isCreator = member.userId === spaceCreatorId;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(member.userId)}
      className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-control border border-transparent p-3 text-left transition-all duration-200 hover:border-border hover:bg-info-soft/50 focus:outline-none focus:ring-4 focus:ring-ring"
    >
      <div className="relative h-11 w-11 shrink-0">
        <div className="h-full w-full overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
          {member.profile?.avatarUrl ? (
            <img
              src={member.profile.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{getInitial(member, unknownUser) || <User size={16} />}</span>
          )}
        </div>
        {isCreator ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-warning border border-border text-warning-foreground"
            title="Owner"
          >
            <FaKey size={8} />
          </span>
        ) : isAdmin ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-muted-foreground border border-border text-primary-foreground"
            title="Admin"
          >
            <FaKey size={8} />
          </span>
        ) : null}
      </div>

      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          {isAdmin ? (
            <span className="shrink-0 rounded-full border border-border bg-info-soft px-1.5 py-0.5 text-xs font-semibold uppercase leading-none text-info">
              Admin
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {member.profile?.email}
        </span>
      </span>
    </button>
  );
}

