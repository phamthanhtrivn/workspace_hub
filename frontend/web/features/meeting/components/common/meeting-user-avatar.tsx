"use client";

import type { ComponentProps } from "react";
import { UserAvatar } from "@/components/common/user-avatar";
import { useAppSelector } from "@/store/store";

type MeetingUserAvatarProps = ComponentProps<typeof UserAvatar> & {
  userId: string;
};

/** The signed-in profile can be newer than meeting snapshots or room metadata. */
export function MeetingUserAvatar({
  userId,
  src,
  ...props
}: MeetingUserAvatarProps) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const currentAvatarUrl = useAppSelector((state) => state.auth.avatarUrl);

  return (
    <UserAvatar
      {...props}
      src={userId === currentUserId ? currentAvatarUrl : src}
    />
  );
}
