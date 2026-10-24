"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { useAppDispatch } from "@/store/store";
import { getPublicProfile } from "../../../api/chat.api";
import {
  CHAT_DEFAULT_STALE_TIME_MS,
  chatKeys,
} from "../../../types/chat.constant";
import type { ChannelResponse } from "../../../types/chat.types";
import { isPrivateChannel } from "../../../utils/channel-membership-permissions";

export default function ChannelOwnerSection({
  channel,
}: {
  channel: ChannelResponse;
}) {
  const dispatch = useAppDispatch();
  // Private ownership can change without changing the original creator.
  // Default channels belong to the system and have no user profile.
  const ownerId = channel.isDefault
    ? null
    : isPrivateChannel(channel)
      ? channel.ownerId
      : channel.createdBy;
  const knownProfile = channel.members.find(
    (member) => member.userId === ownerId,
  )?.profile;
  const needsProfile =
    !!ownerId && !knownProfile?.fullName && !knownProfile?.email;
  const profileQuery = useQuery({
    queryKey: chatKeys.userProfile(ownerId),
    queryFn: async () => (await getPublicProfile(ownerId!)).data,
    enabled: needsProfile,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });
  const profile = needsProfile ? profileQuery.data : knownProfile;
  const loading = needsProfile && profileQuery.isPending;
  const failed = needsProfile && profileQuery.isError;
  const displayName = profile?.fullName || profile?.email || "Unknown user";

  return (
    <section
      aria-label="Channel owner"
      className="min-w-0 border-b border-border px-4 py-4"
    >
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        Channel owner
      </h3>
      {channel.isDefault ? (
        <div className="flex min-w-0 items-center gap-3 p-2">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"
          >
            <Bot size={20} />
          </span>
          <span className="text-sm font-medium text-foreground">System</span>
        </div>
      ) : loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading owner…
        </p>
      ) : failed && !profile ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Could not load the channel owner.
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              void profileQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : ownerId ? (
        <Button
          type="button"
          variant="unstyled"
          onClick={() => dispatch(setSelectedProfileUserId(ownerId))}
          aria-label={`View profile of ${displayName}`}
          className="flex w-full min-w-0 items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-muted"
        >
          <Avatar className="size-10 border border-border" aria-hidden="true">
            <AvatarImage src={profile?.avatarUrl || undefined} alt="" />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User size={20} />
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-sm font-medium text-foreground"
              title={displayName}
            >
              {displayName}
            </span>
            {profile?.email && (
              <span
                className="block truncate text-xs text-muted-foreground"
                title={profile.email}
              >
                {profile.email}
              </span>
            )}
          </span>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Owner information is unavailable.</p>
      )}
    </section>
  );
}
