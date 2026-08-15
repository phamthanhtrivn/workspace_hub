"use client";

import { User } from "lucide-react";
import { ChannelMemberListItem } from "../../types/chat.types";

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

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(member.userId)}
      className="flex w-full min-w-0 items-center gap-3 rounded-md px-1 py-2 text-left text-slate-200 transition hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-sm font-semibold text-white">
        {member.profile?.avatarUrl ? (
          <img
            src={member.profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitial(member) || <User size={16} />}</span>
        )}
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-slate-700" />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-100">
          {displayName}
        </span>
        <span className="block truncate text-xs text-slate-400">{handle}</span>
      </span>
    </button>
  );
}
