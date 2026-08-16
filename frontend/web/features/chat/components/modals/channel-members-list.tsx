"use client";

import { ChannelMemberListItem } from "../../types/chat.types";
import ChannelMemberRow from "./channel-member-row";

interface ChannelMembersListProps {
  members: ChannelMemberListItem[];
  onOpenProfile: (userId: string) => void;
  spaceCreatorId?: string | null;
}

export default function ChannelMembersList({
  members,
  onOpenProfile,
  spaceCreatorId,
}: ChannelMembersListProps) {
  if (members.length === 0) return null;

  return (
    <section className="space-y-1">
      <div className="space-y-1">
        {members.map((member) => (
          <ChannelMemberRow
            key={member.userId}
            member={member}
            onOpenProfile={onOpenProfile}
            spaceCreatorId={spaceCreatorId}
          />
        ))}
      </div>
    </section>
  );
}
