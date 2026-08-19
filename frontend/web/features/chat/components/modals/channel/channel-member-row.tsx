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

function getDisplayName(member: ChannelMemberListItem) {
  return (
    member.nickname ||
    member.profile?.fullName ||
    member.profile?.email ||
    "Unknown user"
  );
}

function getInitial(member: ChannelMemberListItem) {
  return getDisplayName(member).charAt(0).toUpperCase();
}

export default function ChannelMemberRow({
  member,
  onOpenProfile,
  spaceCreatorId,
}: ChannelMemberRowProps) {
  const displayName = getDisplayName(member);
  const isAdmin = member.role === SpaceRole.ADMIN;
  const isCreator = member.userId === spaceCreatorId;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(member.userId)}
      className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-all duration-200 hover:border-blue-100 hover:bg-blue-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
    >
      <div className="relative h-11 w-11 shrink-0">
        <div className="h-full w-full overflow-hidden rounded-full border border-gray-100 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500 shadow-sm">
          {member.profile?.avatarUrl ? (
            <img
              src={member.profile.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{getInitial(member) || <User size={16} />}</span>
          )}
        </div>
        {isCreator ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 border border-white text-white shadow-sm"
            title="Owner"
          >
            <FaKey size={8} />
          </span>
        ) : isAdmin ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-400 border border-white text-white shadow-sm"
            title="Admin"
          >
            <FaKey size={8} />
          </span>
        ) : null}
      </div>

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
          {member.profile?.email}
        </span>
      </span>
    </button>
  );
}
