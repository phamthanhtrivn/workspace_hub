"use client";

import { User } from "lucide-react";
import {
  ChannelMemberListItem,
  ConversationRoles,
} from "../../types/chat.types";

interface ChannelMemberRowProps {
  member: ChannelMemberListItem;
  onOpenProfile: (userId: string) => void;
}

function getDisplayName(member: ChannelMemberListItem) {
  return (
    member.nickname ||
    member.profile?.fullName ||
    member.profile?.email ||
    "Unknown user"
  );
}

function getHandle(member: ChannelMemberListItem) {
  const email = member.profile?.email;
  if (!email) return member.userId;
  return `@${email.split("@")[0]}`;
}

function getInitial(member: ChannelMemberListItem) {
  return getDisplayName(member).charAt(0).toUpperCase();
}

export default function ChannelMemberRow({
  member,
  onOpenProfile,
}: ChannelMemberRowProps) {
  const displayName = getDisplayName(member);
  const handle = getHandle(member);
  const isAdmin = member.role === ConversationRoles.ADMIN;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(member.userId)}
      className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-all duration-200 hover:border-blue-100 hover:bg-blue-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-semibold text-gray-500 shadow-sm">
        {member.profile?.avatarUrl ? (
          <img
            src={member.profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitial(member) || <User size={16} />}</span>
        )}
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-gray-800">
            {displayName}
          </span>
          {isAdmin ? (
            <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-blue-600">
              Admin
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-gray-500">
          {handle}
        </span>
      </span>
    </button>
  );
}
