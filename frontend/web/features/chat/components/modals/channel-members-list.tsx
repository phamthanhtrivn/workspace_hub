"use client";

import { ChannelMemberListItem } from "../../types/chat.types";
import ChannelMemberRow from "./channel-member-row";

interface ChannelMembersListProps {
  title: string;
  members: ChannelMemberListItem[];
  onOpenProfile: (userId: string) => void;
}

export default function ChannelMembersList({
  title,
  members,
  onOpenProfile,
}: ChannelMembersListProps) {
  if (members.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="space-y-1">
        {members.map((member) => (
          <ChannelMemberRow
            key={member.userId}
            member={member}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
    </section>
  );
}
